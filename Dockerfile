# This file is for creating an image for building locally where your local system
# does not support rpm. It is simply node + rpm.

# Usage: cd <path_to_f5-cloud-workers>
#        make sure docker daemon is running on your local system
#        docker build -t f5-cloud-workers .
#        docker run -v $(pwd):/build f5-cloud-workers /build/build.sh
#        RPMs will be in path_to_f5-cloud-workers/dist
FROM node:4

RUN apt-get update && apt-get install -y \
    rpm

WORKDIR /build
