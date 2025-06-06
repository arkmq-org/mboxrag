#!/usr/bin/env sh

DEFAULT_IMAGE="quay.io/arkmq-org/mbox-rag-frontend:latest"

API_SERVER_IMAGE=${DEFAULT_IMAGE}

SCRIPT_NAME=$(basename "$0")

function printUsage() {
  echo "${SCRIPT_NAME}: Deploying to openshift"
  echo "Usage:"
  echo "  ./${SCRIPT_NAME} -i|--image <image url>"
  echo "Options: "
  echo "  -i|--image  Specify the plugin image to deploy. (default is ${DEFAULT_IMAGE})"
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
    -*|--*)
      echo "Unknown option $1"
      printUsage
      exit 1
      ;;
    *)
      ;;
  esac
done

# retrieve the cluster domain to produce a valid cluster issuer
clusterDomain=$(oc get -n openshift-ingress-operator ingresscontroller/default -o json | jq -r '.status.domain')
if test -z "$clusterDomain"
then
  echo "The cluster domain can't be retrieved"
  exit 1
fi

echo "cluster domain: $clusterDomain"
echo "deploying using image: ${API_SERVER_IMAGE}"
oc kustomize deploy \
    | sed "s|image: .*|image: ${API_SERVER_IMAGE}|" \
    | sed "s|apps.crc.testing|${clusterDomain}|" \
    | oc apply -f -
