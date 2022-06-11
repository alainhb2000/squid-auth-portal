function MyLdapError(ldapError) {
    let msg = '';
    switch (ldapError.code) {
        case 'ECONNRESET':
            msg = 'La conexión ha sido reseteada';
            break;
        case 0 :
            msg = 'Exitoso';
            break;
        case 1 :
            msg = 'Error ejecutando la operación';
            break;
        case 2 :
            msg = 'Error del protocolo';
            break;
        case 3 :
            msg = 'Límite de tiempo excedido';
            break;
        case 4 :
            msg = 'Límite de tamaño excedido';
            break;
        case 5 :
            msg = 'Comparación falsa';
            break;
        case 6 :
            msg = 'Comparación verdadera';
            break;
        case 7 :
            msg = 'Método de autenticación no soportado';
            break;
        case 8 :
            msg = 'Autenticación sólida requerida';
            break;
        case 10 :
            msg = 'Referencia';
            break;
        case 11 :
            msg = 'Límite de administrador excedido';
            break;
        case 12 :
            msg = 'Extensión crítica no disponible';
            break;
        case 13 :
            msg = 'Confidencialidad requerida';
            break;
        case 14 :
            msg = 'Enlace SASL en progreso';
            break;
        case 16 :
            msg = 'El atributo no existe';
            break;
        case 17 :
            msg = 'Tipo de atributo indefinido';
            break;
        case 18 :
            msg = 'Coincidencia inapropiada';
            break;
        case 19 :
            msg = 'Violación de restricción';
            break;
        case 20 :
            msg = 'El atributo o el valor existe';
            break;
        case 21 :
            msg = 'La sintaxis del atributo no es válida';
            break;
        case 32 :
            msg = 'El objeto no existe';
            break;
        case 33 :
            msg = 'Problema con el alias';
            break;
        case 34 :
            msg = 'La sintaxis DN no es válida';
            break;
        case 36 :
            msg = 'Problema con la referencia del alias';
            break;
        case 48 :
            msg = 'Autenticación inapropiada';
            break;
        case 49 :
            msg = 'Credenciales incorrectas';
            break;
        case 50 :
            msg = 'Permisos de acceso insuficientes';
            break;
        case 51 :
            msg = 'Ocupado';
            break;
        case 52 :
            msg = 'No disponible';
            break;
        case 53 :
            msg = 'No dispuesto a realizar';
            break;
        case 54 :
            msg = 'Bucle detectado';
            break;
        case 64 :
            msg = 'Violación de nombres';
            break;
        case 65 :
            msg = 'Violación de la clase de objeto';
            break;
        case 66 :
            msg = 'No está permitido en ninguna rama';
            break;
        case 67 :
            msg = 'No está permitido en RDN';
            break;
        case 68 :
            msg = 'El objeto ya existe';
            break;
        case 69 :
            msg = 'Las modificaciones a las clases de objetos están prohibidas';
            break;
        case 71 :
            msg = 'Afecta múltiples DSAS';
            break;
        case 80 :
            msg = 'Se venció el tiempo de espera intentando establecer la conexión con el servidor LDAP';
            break;
        case 123 :
            msg = 'Autorización de proxy denegada';
            break;
        default:
            msg = ldapError.message || 'Error desconocido';
            break;
    }

    this.name = this.constructor.name;
    this.stack = ldapError.stack;
    this.message = msg;
    this.code = ldapError.code;
}

require('util').inherits(MyLdapError, Error);

module.exports.MyLdapError = MyLdapError;
