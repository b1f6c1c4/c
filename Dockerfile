FROM mhart/alpine-node:slim-12

COPY . /opt/c/

WORKDIR /opt/c/work

CMD ["node", "/opt/c/src/index.js"]

EXPOSE 3000
