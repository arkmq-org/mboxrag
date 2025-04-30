#!/usr/bin/env sh

DEFAULT_IMAGE="quay.io/arkmq-org/mbox-rag-server:latest"

MODEL_API_URL=""
MODEL=""
MODEL_ACCESS_TOKEN=""

API_SERVER_IMAGE=${DEFAULT_IMAGE}

SCRIPT_NAME=$(basename "$0")

function printUsage() {
  echo "${SCRIPT_NAME}: Deploying to openshift"
  echo "Usage:"
  echo "  ./${SCRIPT_NAME} -i|--image <image url>"
  echo "Options: "
  echo "  -i|--image  Specify the plugin image to deploy. (default is ${DEFAULT_IMAGE})"
  echo "  -m|--model  set the llm model to be used"
  echo "  -a|--model-api-url  set the llm api url"
  echo "  -t|--model-access-token  set the llm access token"
  echo "  -h|--help   Print this message."
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      printUsage
      exit 0
      ;;
    -i|--image)
      API_SERVER_IMAGE="$2"
      shift
      shift
      ;;
    -m|--model)
      MODEL="$2"
      shift
      shift
      ;;
    -a|--model-api-url)
      MODEL_API_URL="$2"
      shift
      shift
      ;;
    -t|--model-access-token)
      MODEL_ACCESS_TOKEN="$2"
      shift
      shift
      ;;
    -*|--*)
      echo "Unknown option $1"
      printUsage
      exit 1
      ;;
    *)
      ;;
  esac
done

if [ -z "${MODEL}" ]; then
    echo "model must be set"
    printUsage
    exit 1
fi
if [ -z "${MODEL_API_URL}" ]; then
    echo "model api url must be set"
    printUsage
    exit 1
fi
if [ -z "${MODEL_ACCESS_TOKEN}" ]; then
    echo "model access token must be set"
    printUsage
    exit 1
fi


# retrieve the cluster domain to produce a valid cluster issuer
clusterDomain=$(oc get -n openshift-ingress-operator ingresscontroller/default -o json | jq -r '.status.domain')
if test -z "$clusterDomain"
then
  echo "The cluster domain can't be retrived"
  exit 1
fi
echo "cluster domain: $clusterDomain"

echo "deploying using image: ${API_SERVER_IMAGE}"
oc kustomize deploy \
    | sed "s|image: .*|image: ${API_SERVER_IMAGE}|" \
    | sed "s|value: model-api-url|value: ${MODEL_API_URL}|" \
    | sed "s|value: model-name|value: ${MODEL}|" \
    | sed "s|value: model-token|value: ${MODEL_ACCESS_TOKEN}|" \
    | sed "s|apps.crc.testing|${clusterDomain}|" \
    | oc apply -f -
