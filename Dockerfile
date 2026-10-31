# railway builds this: caddy serving the static site on $PORT
FROM caddy:2.8-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY index.html style.css favicon.ico /srv/
COPY assets /srv/assets
