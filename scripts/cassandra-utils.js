import StorageFactory from '../src/storage/index.js'
import { basePino } from '../src/core/logger.js'

const logger = basePino.child({ component: 'cassandra-utils' })

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

    logger.info('✅ Successfully seeded Cassandra with initial URLs')
    logger.info(`📊 Added ${genericNewsUrls.length} generic-news seeds`)
    logger.info(`📊 Added ${weiboUrls.length} weibo seeds`)

    // Show stats
    const newsStats = await storage.seeds.getSeedStats('generic-news')
    const weiboStats = await storage.seeds.getSeedStats('weibo')

    logger.info('📈 Seed Statistics:')
    logger.info({ newsStats }, 'Generic News')
    logger.info({ weiboStats }, 'Weibo')
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to seed Cassandra')
    throw error
  } finally {
    await storageFactory.shutdown()
  }
}

async function showCassandraStatus() {
  const storageFactory = new StorageFactory()

  try {
    const storage = await storageFactory.createCassandraStorage()

    logger.info('🔍 Cassandra Status:')

    // Check seed counts
    const parsers = ['generic-news', 'weibo']
    for (const parser of parsers) {
      const seeds = await storage.seeds.getSeedUrls(parser, { limit: 1000 })
      const stats = await storage.seeds.getSeedStats(parser)
      logger.info(`📋 ${parser}:`)
      logger.info(`  Active seeds: ${seeds.length}`)
      logger.info({ stats }, '  Stats')
    }

    // Check article counts
    const genericMetrics = await storage.articles.getMetrics('generic-news', 7)
    const weiboMetrics = await storage.articles.getMetrics('weibo', 7)

    logger.info('📊 Article Metrics (last 7 days):')
    logger.info(`Generic News: ${genericMetrics.length} data points`)
    logger.info(`Weibo: ${weiboMetrics.length} data points`)

    // Check duplicate stats
    const dupStats = await storage.articles.getDuplicateStats(null, 7)
    logger.info('🔄 Duplicate Statistics:')
    dupStats.forEach(stat => {
      logger.info(
        `  ${stat.domain} (${stat.parserId}): ${stat.totalArticles} articles`
      )
    })
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to get Cassandra status')
    throw error
  } finally {
    await storageFactory.shutdown()
  }
}

// CLI interface
const command = process.argv[2]

switch (command) {
  case 'seed':
    seedCassandra().catch(error =>
      logger.error({ err: error }, 'Seed command failed')
    )
    break
  case 'status':
    showCassandraStatus().catch(error =>
      logger.error({ err: error }, 'Status command failed')
    )
    break
  default:
    logger.info('Usage: node scripts/cassandra-utils.js [seed|status]')
    logger.info('')
    logger.info('Commands:')
    logger.info('  seed   - Populate Cassandra with initial seed URLs')
    logger.info('  status - Show current Cassandra data statistics')
}
