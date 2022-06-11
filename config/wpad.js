function FindProxyForURL(url, host) {
  if (isPlainHostName(host)) return "DIRECT";

  if (isInNet(host, "127.0.0.0", "255.0.0.0") ||
    isInNet(host, "10.0.0.0", "255.0.0.0") ||
    isInNet(host, "172.16.0.0", "255.240.0.0") ||
    isInNet(host, "192.168.0.0", "255.255.0.0"))
    return "DIRECT";

  if (dnsDomainIs(host, ".tld.cu") ||
    dnsDomainIs(host, "tld.cu") ||    
    shExpMatch(url, "http://detectportal.firefox.com/success.txt") ||
    shExpMatch(url, "http://detectportal.firefox.com/canonical.html") ||
    shExpMatch(url, "http://clients1.google.com/generate_204") ||
    shExpMatch(url, "http://clients2.google.com/generate_204") ||
    shExpMatch(url, "http://clients3.google.com/generate_204") ||
    shExpMatch(url, "http://clients4.google.com/generate_204") ||
    shExpMatch(url, "http://connectivitycheck.gstatic.com/generate_204") ||
    shExpMatch(url, "http://www.msftncsi.com/ncsi.txt") ||
    shExpMatch(url, "http://www.microsoftconnecttest.com/connecttest.txt") ||
    shExpMatch(url, "http://ipv6.microsoftconnecttest.com/connecttest.txt") ||
    shExpMatch(url, "http://captive.apple.com/")
  )
    return "DIRECT";

  return "PROXY proxy.tld.cu:1080;";
}
