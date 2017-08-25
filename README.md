# iControlLX extensions specific to BIG-IPs in cloud environments

## Building dev releases on your local system
    cd <path_to_f5-cloud-workers>
    make sure docker daemon is running on your local system
    docker build -t f5-cloud-workers .
    docker run -v $(pwd):/build f5-cloud-workers /build/build.sh
    RPMs will be in path_to_f5-cloud-workers/dist
