import { ProxyConfiguration } from 'crawlee'

// Free proxy lists (use with caution - these are public and may be unreliable)
const FREE_PROXIES = [
  // These are examples - actual free proxies change frequently
  'http://103.152.112.162:80',
  'http://185.32.6.129:8090',
  'http://103.149.162.194:80',
  'http://103.152.112.157:80',
  'http://185.32.6.131:8090',
]

/**
 * Fetches fresh proxy list from ProxyScrape v4 API
 * @param {Object} options - Configuration options
 * @param {string} options.protocol - 'http', 'socks4', 'socks5'
 * @param {number} options.timeout - Timeout in milliseconds (1000-10000)
 * @param {string} options.country - Country code (e.g., 'US', 'GB') or 'all'
 * @returns {Promise<string[]>} Array of proxy URLs
 */
async function fetchProxyScrapeProxies(options = {}) {
  const { protocol = 'http', timeout = 5000, country = 'all' } = options

  // Use the v4 API endpoint with JSON format
  const apiUrl = new URL('https://api.proxyscrape.com/v4/free-proxy-list/get')
  apiUrl.searchParams.set('request', 'display_proxies')
  apiUrl.searchParams.set('proxy_format', 'protocolipport')
  apiUrl.searchParams.set('format', 'json')

  // Add optional filters
  if (protocol !== 'all') {
    apiUrl.searchParams.set('protocol', protocol)
  }
  if (timeout) {
    apiUrl.searchParams.set('timeout', timeout.toString())
  }
  if (country !== 'all') {
    apiUrl.searchParams.set('country', country)
  }

  try {
    console.log(`Fetching proxies from ProxyScrape v4: ${apiUrl.toString()}`)

    const response = await fetch(apiUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebScraper/1.0)',
      },
    })

    if (!response.ok) {
      throw new Error(
        `ProxyScrape API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()

    if (!data || !data.proxies || !Array.isArray(data.proxies)) {
      console.warn('ProxyScrape returned invalid JSON structure')
      return []
    }

    // The v4 API returns proxy objects with a 'proxy' field containing the full URL
    const proxies = data.proxies
      .filter(proxyObj => proxyObj && proxyObj.proxy && proxyObj.alive)
      .map(proxyObj => proxyObj.proxy)
      .filter(
        proxy => proxy && typeof proxy === 'string' && proxy.includes('://')
      )

    console.log(`Fetched ${proxies.length} proxies from ProxyScrape v4`)

    if (proxies.length === 0) {
      console.warn('No valid proxies found in ProxyScrape response')
    } else {
      console.log(`Sample proxies: ${proxies.slice(0, 3).join(', ')}`)
    }

    return proxies
  } catch (error) {
    console.warn(`Failed to fetch ProxyScrape proxies: ${error.message}`)
    return []
  }
}

export async function createProxyConfiguration() {
  // Check for explicit proxy configuration
  if (process.env.PROXY_URL) {
    return new ProxyConfiguration({
      proxyUrls: [process.env.PROXY_URL],
    })
  }

  // Use tiered proxy configuration for better reliability
  if (process.env.USE_TIERED_PROXYSCRAPE === 'true') {
    const countries = (
      process.env.PROXYSCRAPE_COUNTRIES || 'US,GB,CA,AU,DE'
    ).split(',')
    const protocol = process.env.PROXYSCRAPE_PROTOCOL || 'http'
    const timeout = parseInt(process.env.PROXYSCRAPE_TIMEOUT || '5000')

    const tieredProxyUrls = []

    // Fetch proxies for each country tier
    for (const country of countries) {
      const proxies = await fetchProxyScrapeProxies({
        protocol,
        timeout,
        country: country.trim(),
      })

      if (proxies.length > 0) {
        tieredProxyUrls.push(proxies)
        console.log(`Added ${proxies.length} proxies for country: ${country}`)
      }
    }

    if (tieredProxyUrls.length > 0) {
      return new ProxyConfiguration({
        tieredProxyUrls,
      })
    } else {
      console.warn(
        'No proxies fetched for any country tier, falling back to no proxy'
      )
      return null
    }
  }

  // Use ProxyScrape free proxies (single tier)
  if (process.env.USE_PROXYSCRAPE === 'true') {
    const proxies = await fetchProxyScrapeProxies({
      protocol: process.env.PROXYSCRAPE_PROTOCOL || 'http',
      timeout: parseInt(process.env.PROXYSCRAPE_TIMEOUT || '5000'),
      country: process.env.PROXYSCRAPE_COUNTRY || 'all',
    })

    if (proxies.length > 0) {
      return new ProxyConfiguration({
        proxyUrls: proxies,
      })
    } else {
      console.warn(
        'No proxies fetched from ProxyScrape, falling back to no proxy'
      )
      return null
    }
  }

  // Use free proxy rotation (not recommended for production)
  if (process.env.USE_FREE_PROXIES === 'true') {
    return new ProxyConfiguration({
      proxyUrls: FREE_PROXIES,
    })
  }

  // Check for proxy list file (future enhancement)
  if (process.env.PROXY_LIST) {
    // Could load from file in the future
    return null
  }

  return null
}
