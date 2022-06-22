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
      <td>groupsDn</td>
      <td>DN de grupos</td>
      <td>ou=Groups,domainName=tld.cu,o=domains</td>
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

# Archivo de autoconfiguración wpad (/config/wpad.js) que va a servir la app
```
function FindProxyForURL(url, host) {
 
 if (isPlainHostName(host)) return "DIRECT";
 
 if (
    isInNet(host, "127.0.0.0", "255.0.0.0") ||
    isInNet(host, "10.0.0.0", "255.0.0.0") ||
    isInNet(host, "172.16.0.0", "255.240.0.0") ||
    isInNet(host, "192.168.0.0", "255.255.0.0")
    )
    return "DIRECT";

  if (
     dnsDomainIs(host, ".tld.cu") ||
     dnsDomainIs(host, "tld.cu") ||    
     shExpMatch(url, "*steam*")
     )
    return "DIRECT";

  return "PROXY proxy.tld.cu:1080;";
}
```

  
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
  > npm install
  > 
  > pm2 start /portal/app.js --name Auth_Portal
  > 
  > pm2 save
* Dar acceso al usuario del squid al archivo */lib/squid-auth-helper.js*
  > chown proxy:proxy /portal/lib/squid-auth-helper.js

# ACL en Squid
> external_acl_type ipdbauth ttl=15 negative_ttl=0 %>a /usr/bin/node /portal/lib/squid-auth-helper.js
> 
> external_acl_type internetbd ttl=15 negative_ttl=0 %>a /usr/bin/node /portal/lib/squid-group-helper.js internet
>
> external_acl_type intranetbd ttl=15 negative_ttl=0 %>a /usr/bin/node /portal/lib/squid-group-helper.js intranet
>
> acl deteccion_portal url_regex ^http://detectportal.firefox.com/success.txt ^http://detectportal.firefox.com/canonical.html ^http://clients1.google.com/generate_204 ^http://clients2.google.com/generate_204 ^http://clients3.google.com/generate_204 ^http://connectivitycheck.gstatic.com/generate_204 ^http://www.msftncsi.com/ncsi.txt ^http://www.microsoftconnecttest.com/connecttest.txt ^http://ipv6.microsoftconnecttest.com/connecttest.txt ^http://captive.apple.com
> 
> acl ipauth external ipdbauth
> 
> acl internet external internetbd
> 
> acl intranet external intranetbd
> 
> http_access allow !cuba internet
> 
> http_access allow cuba internet
> 
> http_access allow cuba intranet

> 
> http_access deny deteccion_portal
> 
> deny_info 303:http://proxy.mtz.jovenclub.cu all !ipauth

