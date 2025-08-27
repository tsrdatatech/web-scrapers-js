import StorageFactory from '../storage/index.js'

async function seedCassandra() {
  const storageFactory = new StorageFactory()

  try {
    const storage = await storageFactory.createCassandraStorage()

    // Add generic news seeds
    const genericNewsUrls = [
      'https://feeds.reuters.com/reuters/topNews',
      'https://rss.cnn.com/rss/edition.rss',
      'https://feeds.bbci.co.uk/news/rss.xml',
      'https://www.npr.org/rss/rss.php?id=1001',
      'https://feeds.washingtonpost.com/rss/world',
      'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    ]

    await storage.seeds.addSeedUrls('generic-news', genericNewsUrls, {
      priority: 1,
      label: 'news-feeds',
      metadata: { source_type: 'rss', category: 'news' },
    })

    // Add weibo seeds
    const weiboUrls = [
      'https://weibo.com/u/1234567890',
      'https://weibo.com/u/0987654321',
    ]

    await storage.seeds.addSeedUrls('weibo', weiboUrls, {
      priority: 2,
      label: 'weibo-profiles',
      metadata: { source_type: 'social', platform: 'weibo' },
    })

    console.log('✅ Successfully seeded Cassandra with initial URLs')
    console.log(`📊 Added ${genericNewsUrls.length} generic-news seeds`)
    console.log(`📊 Added ${weiboUrls.length} weibo seeds`)

    // Show stats
    const newsStats = await storage.seeds.getSeedStats('generic-news')
    const weiboStats = await storage.seeds.getSeedStats('weibo')

    console.log('\n📈 Seed Statistics:')
    console.log('Generic News:', newsStats)
    console.log('Weibo:', weiboStats)
  } catch (error) {
    console.error('❌ Failed to seed Cassandra:', error.message)
    throw error
  } finally {
    await storageFactory.shutdown()
  }
}

async function showCassandraStatus() {
  const storageFactory = new StorageFactory()

  try {
    const storage = await storageFactory.createCassandraStorage()

    console.log('🔍 Cassandra Status:')

    // Check seed counts
    const parsers = ['generic-news', 'weibo']
    for (const parser of parsers) {
      const seeds = await storage.seeds.getSeedUrls(parser, { limit: 1000 })
      const stats = await storage.seeds.getSeedStats(parser)
      console.log(`\n📋 ${parser}:`)
      console.log(`  Active seeds: ${seeds.length}`)
      console.log('  Stats:', stats)
    }

    // Check article counts
    const genericMetrics = await storage.articles.getMetrics('generic-news', 7)
    const weiboMetrics = await storage.articles.getMetrics('weibo', 7)

    console.log('\n📊 Article Metrics (last 7 days):')
    console.log(`Generic News: ${genericMetrics.length} data points`)
    console.log(`Weibo: ${weiboMetrics.length} data points`)

    // Check duplicate stats
    const dupStats = await storage.articles.getDuplicateStats(null, 7)
    console.log('\n🔄 Duplicate Statistics:')
    dupStats.forEach(stat => {
      console.log(
        `  ${stat.domain} (${stat.parserId}): ${stat.totalArticles} articles`
      )
    })
  } catch (error) {
    console.error('❌ Failed to get Cassandra status:', error.message)
    throw error
  } finally {
    await storageFactory.shutdown()
  }
}

// CLI interface
const command = process.argv[2]

switch (command) {
  case 'seed':
    seedCassandra().catch(console.error)
    break
  case 'status':
    showCassandraStatus().catch(console.error)
    break
  default:
    console.log('Usage: node scripts/cassandra-utils.js [seed|status]')
    console.log('')
    console.log('Commands:')
    console.log('  seed   - Populate Cassandra with initial seed URLs')
    console.log('  status - Show current Cassandra data statistics')
}
