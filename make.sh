#!/bin/bash

#
# variables
#

# AWS variables
AWS_PROFILE=default
AWS_REGION=eu-west-3
# project name
PROJECT_NAME=gallery-kubernetes


# the directory containing the script file
dir="$(cd "$(dirname "$0")"; pwd)"
cd "$dir"

log()   { echo -e "\e[30;47m ${1^^} \e[0m ${@:2}"; }        # $1 uppercase background white
info()  { echo -e "\e[48;5;28m ${1^^} \e[0m ${@:2}"; }      # $1 uppercase background green
warn()  { echo -e "\e[48;5;202m ${1^^} \e[0m ${@:2}" >&2; } # $1 uppercase background orange
error() { echo -e "\e[48;5;196m ${1^^} \e[0m ${@:2}" >&2; } # $1 uppercase background red

# log $1 in underline then $@ then a newline
under() {
    local arg=$1
    shift
    echo -e "\033[0;4m${arg}\033[0m ${@}"
    echo
}

usage() {
    under usage 'call the Makefile directly: make dev
      or invoke this file directly: ./make.sh dev'
}

# install eksctl if missing (no update)
install-eksctl() {
    if [[ -z $(which eksctl) ]]
    then
        log install eksctl
        warn warn sudo is required
        sudo wget -q -O - https://api.github.com/repos/weaveworks/eksctl/releases \
            | jq --raw-output 'map( select(.prerelease==false) | .assets[].browser_download_url ) | .[]' \
            | grep inux \
            | head -n 1 \
            | wget -q --show-progress -i - -O - \
            | sudo tar -xz -C /usr/local/bin

        # bash completion
        [[ -z $(grep eksctl_init_completion ~/.bash_completion 2>/dev/null) ]] \
            && eksctl completion bash >> ~/.bash_completion
    fi
}

# install kubectl if missing (no update)
install-kubectl() {
    if [[ -z $(which kubectl) ]]
    then
        log install eksctl
        warn warn sudo is required
        VERSION=$(curl --silent https://storage.googleapis.com/kubernetes-release/release/stable.txt)
        cd /usr/local/bin
        sudo curl https://storage.googleapis.com/kubernetes-release/release/$VERSION/bin/linux/amd64/kubectl \
            --progress-bar \
            --location \
            --remote-name
        sudo chmod +x kubectl
    fi
}


create-env() {
    log install convert npm modules
    cd "$dir/convert"
    npm install

    log install storage npm modules
    cd "$dir/storage"
    npm install

    log install website npm modules
    cd "$dir/website"
    npm install

    [[ -f "$dir/.env" ]] && { warn warn .env already exists; return; }

    # check if user already exists (return something if user exists, otherwise return nothing)
    local exists=$(aws iam list-user-policies \
        --user-name $PROJECT_NAME \
        --profile $AWS_PROFILE \
        2>/dev/null)
        
    [[ -n "$exists" ]] && { error abort user $PROJECT_NAME already exists; return; }

    # create a user named $PROJECT_NAME
    log create iam user $PROJECT_NAME
    aws iam create-user \
        --user-name $PROJECT_NAME \
        --profile $AWS_PROFILE \
        1>/dev/null

    aws iam attach-user-policy \
        --user-name $PROJECT_NAME \
        --policy-arn arn:aws:iam::aws:policy/PowerUserAccess \
        --profile $AWS_PROFILE

    local key=$(aws iam create-access-key \
        --user-name $PROJECT_NAME \
        --query 'AccessKey.{AccessKeyId:AccessKeyId,SecretAccessKey:SecretAccessKey}' \
        --profile $AWS_PROFILE \
        2>/dev/null)

    AWS_ACCESS_KEY_ID=$(echo "$key" | jq '.AccessKeyId' --raw-output)
    log AWS_ACCESS_KEY_ID $AWS_ACCESS_KEY_ID
    
    AWS_SECRET_ACCESS_KEY=$(echo "$key" | jq '.SecretAccessKey' --raw-output)
    log AWS_SECRET_ACCESS_KEY $AWS_SECRET_ACCESS_KEY

    # root account id
    ACCOUNT_ID=$(aws sts get-caller-identity \
        --query 'Account' \
        --profile $AWS_PROFILE \
        --output text)

    # create s3 bucket
    AWS_S3_BUCKET=$PROJECT_NAME-$(mktemp --dry-run XXXX | tr '[:upper:]' '[:lower:]')
    log create $AWS_S3_BUCKET bucket
    aws s3 mb s3://$AWS_S3_BUCKET \
        --region $AWS_REGION \
        --profile $AWS_PROFILE

    # create .env
    sed --expression "s|{{AWS_ACCESS_KEY_ID}}|$AWS_ACCESS_KEY_ID|" \
        --expression "s|{{AWS_SECRET_ACCESS_KEY}}|$AWS_SECRET_ACCESS_KEY|" \
        --expression "s|{{PROJECT_NAME}}|$PROJECT_NAME|" \
        --expression "s|{{ACCOUNT_ID}}|$ACCOUNT_ID|" \
        --expression "s|{{AWS_S3_BUCKET}}|$AWS_S3_BUCKET|" \
        .env.sample \
        > .env

    info created file .env
}

# install eksctl + kubectl, create aws user + s3 bucket
setup() {
    install-eksctl
    install-kubectl
    create-env
}

# local development with docker-compose
dev() {
    docker-compose \
        --file docker-compose.dev.yml \
        --project-name compose_gallery_kubernetes_dev \
        --env-file .env \
        up \
        # --remove-orphans \
        # --force-recreate \
        # --build
}

create-ecr-build-push-image() {
    [[ -z "$1" ]] && { warn abort an image name is required; return; }

    # create ECR repository
    local repo=$(aws ecr describe-repositories \
        --repository-names $1 \
        --region $AWS_REGION \
        --profile $AWS_PROFILE \
        2>/dev/null)
    if [[ -z "$repo" ]]
    then
        log ecr create-repository for $1
        aws ecr create-repository \
            --repository-name $1 \
            --region $AWS_REGION \
            --profile $AWS_PROFILE
    fi

    # get repository URI
    REPOSITORY_URI=$(aws ecr describe-repositories \
        --query "repositories[?repositoryName == '$1'].repositoryUri" \
        --region $AWS_REGION \
        --profile $AWS_PROFILE \
        --output text)
    log REPOSITORY_URI $REPOSITORY_URI

    # root account id
    ACCOUNT_ID=$(aws sts get-caller-identity \
        --query 'Account' \
        --profile $AWS_PROFILE \
        --output text)
    log ACCOUNT_ID $ACCOUNT_ID
    
    # add login data into /home/$USER/.docker/config.json (create or update authorization token)
    aws ecr get-login-password \
        --region $AWS_REGION \
        --profile $AWS_PROFILE \
        | docker login \
        --username AWS \
        --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

    # build, tag and push storage
    cd "$dir/$1"
    VERSION=$(jq --raw-output '.version' package.json)
    log build $1:$VERSION
    docker image build \
        --tag $1:latest \
        --tag $1:$VERSION \
        .

    docker tag $1:latest $REPOSITORY_URI:latest
    docker tag $1:latest $REPOSITORY_URI:$VERSION
    log push $REPOSITORY_URI:$VERSION
    docker push $REPOSITORY_URI:latest
    docker push $REPOSITORY_URI:$VERSION
}

# build production images and push to ECR
build-push() {
    create-ecr-build-push-image storage
    create-ecr-build-push-image convert
    create-ecr-build-push-image website
}

# run production images locally
prod() {
    docker-compose \
        --project-name compose_gallery_kubernetes_prod \
        up
}

cluster-create() { # create the EKS cluster
    # check if cluster already exists (return something if the cluster exists, otherwise return nothing)
    local exists=$(aws eks describe-cluster \
        --name $PROJECT_NAME \
        --profile $AWS_PROFILE \
        --region $AWS_REGION \
        2>/dev/null)
        
    [[ -n "$exists" ]] && { error abort cluster $PROJECT_NAME already exists; return; }

    # create a cluster named $PROJECT_NAME
    log create eks cluster $PROJECT_NAME

    eksctl create cluster \
        --name $PROJECT_NAME \
        --region $AWS_REGION \
        --managed \
        --node-type t2.small \
        --nodes 1 \
        --profile $AWS_PROFILE
}

k8s-template() {
    source "$dir/.env"
    sed --expression "s|{{AWS_ACCESS_KEY_ID}}|$AWS_ACCESS_KEY_ID|g" \
        --expression "s|{{AWS_SECRET_ACCESS_KEY}}|$AWS_SECRET_ACCESS_KEY|g" \
        --expression "s|{{AWS_S3_BUCKET}}|$AWS_S3_BUCKET|g" \
        --expression "s|{{PROJECT_NAME}}|$PROJECT_NAME|g" \
        --expression "s|{{ACCOUNT_ID}}|$ACCOUNT_ID|g" \
        --expression "s|{{AWS_REGION}}|$AWS_REGION|g" \
        --expression "s|{{STORAGE_PORT}}|$STORAGE_PORT|g" \
        --expression "s|{{CONVERT_PORT}}|$CONVERT_PORT|g" \
        --expression "s|{{WEBSITE_PORT}}|$WEBSITE_PORT|g" \
        $1
}

cluster-deploy() { # deploy services to EKS
    cd "$dir/k8s"
    for f in namespace secret \
                storage-deployment storage-service \
                convert-deployment convert-service \
                website-deployment website-service
    do
        k8s-template "$f.yaml" | kubectl apply --filename - 
    done
}

cluster-elb() { # get the cluster ELB URI
    kubectl get svc \
        --namespace $PROJECT_NAME \
        --output jsonpath="{.items[?(@.metadata.name=='website')].status.loadBalancer.ingress[].hostname}"
}

cluster-log-convert() { # get the convert logs
    kubectl logs \
        --namespace gallery-kubernetes \
        --selector app=convert \
        --tail=1000
}

cluster-delete() { # delete the EKS cluster
    eksctl delete cluster \
        --name $PROJECT_NAME \
        --region $AWS_REGION \
        --profile $AWS_PROFILE
}

# storage service local development (on current machine, by calling npm script directly)
storage-dev() {
    cd storage
    npm run dev
}

# storage service local development with docker
storage-dev-docker() {
    source "$dir/.env"
    cd storage
    docker image build \
        --file Dockerfile.dev \
        --tag storage-dev:latest \
        .

    docker run \
        --env-file=../.env \
        --volume "$(pwd):/app" \
        --publish $STORAGE_PORT:$STORAGE_PORT \
        storage-dev:latest
}

# run storage service tests (on current machine, by calling npm script directly)
storage-test() {
    cd storage
    DEBUG=storage npm test
}

# run storage service tests with docker
storage-test-docker() {
    cd storage
    docker image build \
        --file Dockerfile.test \
        --tag storage-test:latest \
        .

    docker run \
        --env-file=../.env \
        storage-test:latest
}

# build then run storage service with docker (with .env vars, just to test if it runs correctly)
storage-prod-docker() {
    source "$dir/.env"
    cd storage
    VERSION=$(jq --raw-output '.version' package.json)
    docker image build \
        --tag storage-prod:latest \
        --tag storage-prod:$VERSION \
        .

    docker run \
        --env-file=../.env \
        --publish $STORAGE_PORT:$STORAGE_PORT \
        storage-prod:latest
}


# convert service local development (on current machine, by calling npm script directly)
convert-dev() {
    cd convert
    npm run dev
}

# convert service local development with docker
convert-dev-docker() {
    source "$dir/.env"
    cd convert
    docker image build \
        --file Dockerfile.dev \
        --tag convert-dev:latest \
        .

    docker run \
        --env-file=../.env \
        --volume "$(pwd):/app" \
        --publish $CONVERT_PORT:$CONVERT_PORT \
        convert-dev:latest
}

# run convert service tests (on current machine, by calling npm script directly)
convert-test() {
    cd convert
    DEBUG=convert npm test
}

# run convert service tests with docker
storage-test-docker() {
    cd convert
    docker image build \
        --file Dockerfile.test \
        --tag convert-test:latest \
        .

    docker run \
        --env-file=../.env \
        convert-test:latest
}

# build then run convert service with docker (with .env vars, just to test if it runs correctly)
convert-prod-docker() {
    source "$dir/.env"
    cd convert
    VERSION=$(jq --raw-output '.version' package.json)
    docker image build \
        --tag convert-prod:latest \
        --tag convert-prod:$VERSION \
        .
        # --build-arg CONVERT_PORT=$CONVERT_PORT \

    docker run \
        --env-file=../.env \
        --publish $CONVERT_PORT:$CONVERT_PORT \
        convert-prod:latest
}

# website service local development (on current machine, by calling npm script directly)
website-dev() {
    cd website
    npm run dev
}

# website service local development with docker
website-dev-docker() {
    source "$dir/.env"
    cd website
    docker image build \
        --file Dockerfile.dev \
        --tag website-dev:latest \
        .

    # Warn: --network host is required to connect to other services running on localhost
    # https://docs.docker.com/network/network-tutorial-host/
    docker run \
        --env-file=../.env \
        --volume "$(pwd):/app" \
        --network host \ 
        --publish $WEBSITE_PORT:$WEBSITE_PORT \
        website-dev:latest
}


# if `$1` is a function, execute it. Otherwise, print usage
# compgen -A 'function' list all declared functions
# https://stackoverflow.com/a/2627461
FUNC=$(compgen -A 'function' | grep $1)
[[ -n $FUNC ]] && { info execute $1; eval $1; } || usage;
exit 0