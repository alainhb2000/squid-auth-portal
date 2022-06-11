# squid-auth-portal
Portal de autenticación Web, para evitar peticiones con usuario y contraseña en base64 viajando por la red.

# Requerimientos
* NodeJS v16
* MongoDB 4.4
* Squid

# Configuración (config/config.json)
<table>
  <thead>
    <tr>
      <th>Propiedad</th>
      <th>Descripción</th>
      <th>Posible valor</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>headText</td>
      <td>Texto del encabezado de la página</td>
      <td>Tinored</td>
    </tr>
    <tr>
      <td>mongoConnection</td>
      <td>Cadena de conexión a base de datos en MongoDB</td>
      <td>mongodb://127.0.0.1:27017/squid-auth-portal</td>
    </tr>
    <tr>
      <td>activeDirectory</td>
      <td>Define si usa un tipo de servidor AD</td>
      <td>true/false</td>
    </tr>
    <tr>
      <td>ldapConnection</td>
      <td>Conexión con servidor LDAP/AD</td>
      <td>ldap://10.0.0.2:389</td>
    </tr>
    <tr>
      <td>ldapAdminUsr</td>
      <td>Usuario administrador o solo lectura</td>
      <td>administrador</td>
    </tr>
    <tr>
      <td>ldapAdminPwd</td>
      <td>Contraseña</td>
      <td>****</td>
    </tr>
    <tr>
      <td>ldapDn</td>
      <td>DN ldap</td>
      <td>dc=tld,dc=cu</td>
    </tr>
    <tr>
      <td>domainName</td>
      <td>Nombre del dominio</td>
      <td>tld.cu</td>
    </tr>
    <tr>
      <td>usersDn</td>
      <td>DN de usuarios, para el caso de OpenLDAP</td>
      <td>ou=Users,domainName=tld.cu,o=domains</td>
    </tr>
    <tr>
      <td>isBehindWebserver</td>
      <td>Especificar si el portal se ejecutará detrás de un servidor Web (Apache, Ngix, etc)</td>
      <td>true/false</td>
    </tr>
    <tr>
      <td>backendPort</td>
      <td>En caso de isBehindWebserver estar activado, especificar el puerto</td>
      <td>0..65535</td>
    </tr>
    <tr>
      <td>sessionExpiration</td>
      <td>Minutos de inactividad para declarar sesiones expiradas</td>
      <td>180</td>
    </tr>
    <tr>
      <td>serveWpad</td>
      <td>Servir archivo de autoconfiguración WPAD</td>
      <td>true/false</td>
    </tr>
    <tr>
      <td>cert</td>
      <td>Ubicación del archivo de certificado</td>
      <td>/etc/ssl/tld.cu/fullchain.cer</td>
    </tr>
    <tr>
      <td>key</td>
      <td>Ubicación del archivo de llave privada</td>
      <td>/etc/ssl/tld.cu/tld.cu.key</td>
    </tr>
    <tr>
      <td>trustedIps</td>
      <td>Arreglo de direcciones IP confiables que no necesitan autenticarse en el portal</td>
      <td>["10.0.0.5", "10.0.0.10", "10.55.0.1"]</td>
    </tr>
  </tbody>
</table>
  
# Instalación
* Instalar nodejs
  > apt install nodejs
* Instalar mongodb
  > apt install mongodb-org
* Instalar paquete pm2 con npm a nivel global, para la autoejecución del portal
  > npm i -g pm2
  > 
  > pm2 startup
* Copiar proyecto a una carpeta, por ejemplo: */portal*, luego ejecutar la aplicación con pm2 y guardar sesión
  > pm2 start /portal/app.js --name Auth_Portal
  > 
  > pm2 save
* Dar acceso al usuario del squid al archivo */lib/squid-auth-helper.js*
  > chown proxy:proxy /portal/lib/squid-auth-helper.js

# ACL en Squid
> external_acl_type ipdbauth ttl=15 negative_ttl=0 %>a /usr/bin/node /portal/lib/squid-auth-helper.js
> 
> acl deteccion_portal url_regex ^http://detectportal.firefox.com/success.txt ^http://detectportal.firefox.com/canonical.html ^http://clients1.google.com/generate_204 ^http://clients2.google.com/generate_204 ^http://clients3.google.com/generate_204 ^http://connectivitycheck.gstatic.com/generate_204 ^http://www.msftncsi.com/ncsi.txt ^http://www.microsoftconnecttest.com/connecttest.txt ^http://ipv6.microsoftconnecttest.com/connecttest.txt ^http://captive.apple.com
> 
> acl ipauth external ipdbauth
> 
> http_access allow ipauth
> 
> http_access deny deteccion_portal
> 
> deny_info 302:http://proxy.tld.cu deteccion_portal !ipauth

