FROM kong:3.5.0

USER root
RUN apt update
RUN apt install -y nodejs npm python3 make g++ vim
RUN apt clean
RUN npm i --unsafe -g kong-pdk@0.5.5

COPY ./js-plugins/js-custom-auth /usr/local/kong/js-plugins/js-custom-auth
WORKDIR /usr/local/kong/js-plugins/js-custom-auth
RUN npm i