const ldap = require('ldapjs');
const async = require('async');
const ldap2date = require('ldap2date');
const MyLdapError = require('./myldap_error').MyLdapError;

module.exports = function (options) {

    let clientOptions = {
        url: options.ldapConnection,
        timeout: 5000,
        connectTimeout: 5000
    };

    if (options.tlsOptions)
        clientOptions.tlsOptions = options.tlsOptions;

    function getClientBindDn(usr, dn) {
        return options.activeDirectory ? `cn=${usr},cn=users,${dn}` : `cn=${usr},${dn}`;
    }

    function getAuthDn(usr, dn) {
        return options.activeDirectory ? `${usr}@${options.domainName}` : `mail=${usr}@${options.domainName},${options.usersDn},${dn}`;
    }

    function createClient(cb) {
        let client = ldap.createClient(clientOptions);
        let errorHandled = false;

        client.on('error', function (err) {
            if (errorHandled) return;
            errorHandled = true;
            client.unbind();
            cb && cb(new MyLdapError(err));
        });

        client.on('connectError', function (err) {
            if (errorHandled) return;
            errorHandled = true;
            client.unbind();
            cb && cb(new MyLdapError(err));
        });

        client.bind(
            getClientBindDn(options.ldapAdminUsr, options.ldapDn),
            options.ldapAdminPwd,
            function (err) {
                if (err) {
                    errorHandled = true;
                    client.unbind();
                    return cb && cb(new MyLdapError(err));
                }

                cb && cb(undefined, client);
            }
        );
    }

    function ldap_authenticate(usr, pwd, cb) {
        if (!usr || !pwd)
            return cb && cb(new Error('El usuario y contraseña son obligatorios..'));

        let client = ldap.createClient(clientOptions);
        let errorHandled = false;
        let handleError = function (err) {
            if (errorHandled) return;
            errorHandled = true;
            cb && cb(new MyLdapError(err));
        };
        client.on('error', handleError);

        client.on('connectError', handleError);

        client.bind(
            getAuthDn(usr, options.ldapDn),
            pwd,
            function (err) {
                client.unbind();
                if (err) return handleError(err);
                cb && cb(err, true);
            }
        );
    }

    function ldap_authenticateAsync(usr, pwd) {
        return new Promise((resolve, reject) => {
            ldap_authenticate(usr, pwd, (err, success) => {
                if (err) return reject(err);
                resolve(success);
            })
        })

    }

    function entryParser(entry, addObjectName) {
        let obj = {};
        if (addObjectName)
            obj.objectName = entry.objectName;

        (entry.attributes || []).forEach(function (attr) {
            if (attr.vals instanceof Array) {
                if (attr.vals.length === 1) {
                    switch (attr.type) {
                        case 'jpegPhoto':
                            obj[attr.type] = attr._vals[0];
                            break;
                        case 'member':
                            obj[attr.type] = attr.vals;
                            break;
                        case 'memberUid':
                            obj[attr.type] = attr.vals;
                            break;
                        case 'whenCreated':
                        case 'whenChanged':
                            obj[attr.type] = ldap2date.parse(attr.vals[0]);
                            break;
                        default:
                            obj[attr.type] = attr.vals[0];
                            break;
                    }
                } else
                    obj[attr.type] = attr.vals;

                return;
            }

            obj[attr.type] = attr.vals;

        });

        return obj;
    }

    function ensureDn(dn) {
        if (!dn) return null;

        if (dn.toLowerCase().indexOf(',' + options.ldapDn.toLowerCase()) === -1)
            dn = `${dn},${options.ldapDn}`;

        return dn;
    }

    function ldap_search(searchDn, opt, controls, cb) {
        let hasControls = typeof (controls) === 'function';
        let entries = [];
        let addObjectName = opt.objectName || false;

        if (!cb && controls) {
            cb = controls;
            hasControls = false;
        }

        if (opt && !opt.timeLimit)
            opt.timeLimit = 120;

        createClient(function (err, client) {
            if (err)
                return cb && cb(new MyLdapError(err));

            let handleSearch = function (err, res) {

                if (err)
                    return cb && cb(new MyLdapError(err));

                res.on('searchEntry', function (entry) {
                    entries.push(entryParser(entry, addObjectName));
                });

                res.on('page', function (result, callback) {
                    callback && callback();
                });

                res.on('error', function (err) {
                    client.unbind();
                    return cb && cb(new MyLdapError(err));
                });
                res.on('end', function () {
                    client.unbind();
                    cb && cb(undefined, entries);
                });
            };

            let dn = searchDn;
            if (!dn)
                dn = options.ldapDn;
            else
                dn = ensureDn(dn);

            if (hasControls)
                client.search(dn, opt, controls, handleSearch);
            else
                client.search(dn, opt, handleSearch);
        });
    }

    function ldap_exists(base, opt, cb) {
        createClient(function (err, client) {
            if (err)
                return cb && cb(err);

            client.search(
                ensureDn(`${base},${options.ldapDn}`),
                opt,
                function (err, res) {
                    if (err)
                        return cb && cb(err);

                    res.on('error', function (err) {
                        client.unbind();

                        if (err && err.code === 32)
                            return cb && cb(undefined, false);

                        cb && cb(err);
                    });

                    res.on('end', function () {
                        client.unbind();
                        cb && cb(undefined, true);
                    })
                });
        });
    }

    function ldap_add(dn, entry, cb) {
        createClient(function (err, client) {
            if (err)
                return cb && cb(err);

            client.add(
                ensureDn(`${dn},${options.ldapDn}`),
                entry,
                function (err) {
                    client.unbind();
                    if (err)
                        return cb && cb(new MyLdapError(err));

                    cb && cb();
                })
        });
    }

    function ldap_getGroups(dn, gid, cb) {
        ldap_search(dn, {
            scope: 'one',
            filter: `(&(objectClass=${options.activeDirectory ? 'group' : 'posixGroup'})(gidNumber=${gid}))`
        }, function (err, ldapResult) {
            if (err)
                return cb && cb(err);

            let services = [];

            ldapResult.forEach(function (obj) {
                services.push(
                    {
                        cn: obj.cn,
                        description: obj.description,
                        gidNumber: obj.gidNumber,
                        membersCount: options.activeDirectory ? (obj.member ? obj.member.length : 0) : (obj.memberUid ? obj.memberUid.length : 0),
                        members: obj.memberUid || obj.member || []
                    }
                )
            });

            cb && cb(undefined, services);
        });
    }

    function ldap_getGroupMembers(dn, cb) {
        ldap_search(dn, {
            scope: 'sub',
            filter: `(objectClass=${options.activeDirectory ? 'group' : 'posixGroup'})`,
            attributes: options.activeDirectory ? ['member'] : ['memberUid']
        }, function (err, ldapResult) {
            if (err)
                return cb && cb(err);

            if (ldapResult && ldapResult.length >= 1 && ldapResult[0].member)
                return cb && cb(undefined, ldapResult[0].member);

            cb && cb(undefined, []);
        });
    }

    function ldap_getGroupMembersDetails(dn, attributes, cb) {
        ldap_search(
            dn,
            {
                filter: `(objectClass=${options.activeDirectory ? 'group' : 'posixGroup'})`,
                attributes: options.activeDirectory ? ['member'] : ['memberUid']
            },
            function (err, ldapResult) {
                if (err) return cb && cb(err);

                if (ldapResult && ldapResult.length >= 1) {
                    let members = [];
                    async.eachSeries((options.activeDirectory ? ldapResult[0].member : ldapResult[0].memberUid) || [],
                        function (member, next) {
                            ldap_search(
                                options.usersDn,
                                {
                                    scope: 'one',
                                    filter: `(uid=${member})`, //todo: ver como es con active directory
                                    attributes: attributes
                                },
                                function (err, l) {
                                    if (err) return cb && cb(err);

                                    if (l && l.length > 0)
                                        members.push(l[0]);
                                    else
                                        console.log(member, 'not found');

                                    next();
                                }
                            );
                        },
                        function () {
                            cb && cb(undefined, members);
                        }
                    );
                    return;
                }

                cb && cb(undefined, []);
            });
    }

    function ldap_delete(dn, cb) {
        createClient(function (err, client) {
            if (err)
                return cb && cb(err);

            client.del(`${dn},${options.ldapDn}`, function (err) {
                client.unbind();
                if (err)
                    return cb & cb(err);

                cb && cb();
            })
        });
    }

    function ldap_modify(dn, changes, cb) {
        createClient(function (err, client) {
            if (err)
                return cb && cb(err);

            client.modify(
                ensureDn(`${dn},${options.ldapDn}`),
                changes,
                function (err) {
                    client.unbind();
                    if (err)
                        return cb & cb(err);

                    cb && cb();
                })
        });
    }

    function ldap_modifyDN(dn, newDn, cb) {
        createClient(function (err, client) {
            if (err)
                return cb & cb(err);

            client.modifyDN(
                ensureDn(`${dn},${options.ldapDn}`),
                newDn,
                function (err) {
                    client.unbind();
                    if (err)
                        return cb & cb(err);
                    cb && cb();
                })
        });
    }

    function ldap_change(options) {

        if (Array.isArray(options)) {
            let arr = [];
            options.forEach(function (opt) {
                arr.push(new ldap.Change(opt));
            });
            return arr;
        }

        return new ldap.Change(options);
    }

    return {
        authenticate: ldap_authenticate,
        authenticateAsync: ldap_authenticateAsync,
        search: ldap_search,
        exists: ldap_exists,
        getGroups: ldap_getGroups,
        getGroupMembers: ldap_getGroupMembers,
        getGroupMembersDetails: ldap_getGroupMembersDetails,
        add: ldap_add,
        delete: ldap_delete,
        modify: ldap_modify,
        modifyDN: ldap_modifyDN,
        change: ldap_change
    };

};