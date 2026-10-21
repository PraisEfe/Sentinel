export const INITIAL_MONITORS = [
  {
    id: 'mon-1',
    name: 'MTN Nigeria',
    initials: 'MN',
    category: 'Organisation',
    updatedAt: '2 min ago',
    newActivity: 342,
    totalMentions: 4821,
    frequency: '20 minutes',
    status: 'Active',
    color: '#237a55',
    keywords: ['MTN', '5G', 'broadband', 'telecoms', 'network coverage'],
    sentiment: 'Positive (62%)'
  },
  {
    id: 'mon-2',
    name: 'Dangote Group',
    initials: 'DG',
    category: 'Organisation',
    updatedAt: '4 min ago',
    newActivity: 84,
    totalMentions: 2341,
    frequency: '20 minutes',
    status: 'Active',
    color: '#1d6045',
    keywords: ['Dangote', 'refinery', 'cement', 'manufacturing', 'trade'],
    sentiment: 'Positive (71%)'
  },
  {
    id: 'mon-3',
    name: 'Nigerian banking sector',
    initials: 'NB',
    category: 'Industry',
    updatedAt: '12 min ago',
    newActivity: 126,
    totalMentions: 1882,
    frequency: '1 hour',
    status: 'Active',
    color: '#2d68c4',
    keywords: ['Central Bank', 'fintech', 'interest rates', 'liquidity', 'banking'],
    sentiment: 'Neutral (54%)'
  },
  {
    id: 'mon-4',
    name: 'Cybersecurity',
    initials: 'CS',
    category: 'Topic',
    updatedAt: '18 min ago',
    newActivity: 96,
    totalMentions: 2403,
    frequency: '20 minutes',
    status: 'Active',
    color: '#c65348',
    keywords: ['ransomware', 'data breach', 'vulnerability', 'infosec', 'zero-day'],
    sentiment: 'Critical (41%)'
  }
];

export const RECENT_SEARCHES = [
  { id: 'rs-1', query: 'MTN Nigeria', count: '4,821 results', timeAgo: '12 min ago' },
  { id: 'rs-2', query: 'Dangote', count: '1,361 results', timeAgo: '2d ago' },
  { id: 'rs-3', query: 'Nigerian banking sector', count: '1,882 results', timeAgo: '3d ago' },
  { id: 'rs-4', query: 'Cybersecurity', count: '2,403 results', timeAgo: '4d ago' }
];

export const SEARCH_RESULTS = [
  {
    id: 'res-1',
    channel: 'News',
    source: 'TechCabal',
    sourceDomain: 'techcabal.com',
    title: 'MTN Nigeria announces major service infrastructure initiative',
    excerpt: 'The telecom operator has outlined a new investment programme focused on network resilience, capacity expansion, and high-density urban 5G coverage across key regions.',
    date: '18 min ago',
    author: 'Oluwaseun Adeyemi',
    sentiment: 'Positive',
    reach: '142K readers',
    tags: ['Telecoms', 'Infrastructure', '5G'],
    location: 'Lagos, Nigeria',
    language: 'English',
    url: 'https://techcabal.com'
  },
  {
    id: 'res-2',
    channel: 'News',
    source: 'BusinessDay',
    sourceDomain: 'businessday.ng',
    title: 'Telecom providers accelerate rural connectivity expansion in West Africa',
    excerpt: 'Collaborative fiber deployment and shared tower infrastructure are expected to reduce capital expenditure while bringing high-speed broadband to underserved commercial corridors.',
    date: '42 min ago',
    author: 'Chinedu Eze',
    sentiment: 'Positive',
    reach: '98K readers',
    tags: ['Broadband', 'Investment', 'Regional'],
    location: 'Abuja, Nigeria',
    language: 'English',
    url: 'https://businessday.ng'
  },
  {
    id: 'res-3',
    channel: 'Social',
    source: 'X (Twitter)',
    sourceDomain: 'x.com',
    title: 'Public discussions surge regarding fiber reliability and latency improvements',
    excerpt: 'Multiple tech leads and consumers in Victoria Island report noticeable improvements in upload speeds following yesterday afternoon maintenance window.',
    date: '1 hr ago',
    author: '@techpulse_ng',
    sentiment: 'Positive',
    reach: '34K views',
    tags: ['User Experience', 'Lagos', 'Speed'],
    location: 'Lagos, Nigeria',
    language: 'English',
    url: 'https://x.com'
  },
  {
    id: 'res-4',
    channel: 'Websites',
    source: 'Telecoms Weekly Digest',
    sourceDomain: 'telecomsdigest.africa',
    title: 'Quarterly African telecommunications infrastructure and tower metrics',
    excerpt: 'A comprehensive benchmark analysis of operational uptime, power resilience, and renewable energy adoption across national mobile networks.',
    date: '3 hrs ago',
    author: 'Industry Analysis Desk',
    sentiment: 'Neutral',
    reach: '22K readers',
    tags: ['Research', 'Benchmarking'],
    location: 'Regional',
    language: 'English',
    url: 'https://telecomsdigest.africa'
  },
  {
    id: 'res-5',
    channel: 'Blogs',
    source: 'Silicon Africa Insights',
    sourceDomain: 'siliconafrica.co',
    title: 'Why resilient digital infrastructure is the cornerstone of African fintech growth',
    excerpt: 'Financial payment rails depend on sub-second confirmation times. When telecommunications backbones upgrade, merchant transaction failure rates plummet by up to 34%.',
    date: '5 hrs ago',
    author: 'Kofi Mensah',
    sentiment: 'Positive',
    reach: '16K readers',
    tags: ['Fintech', 'Finances', 'Infrastructure'],
    location: 'West Africa',
    language: 'English',
    url: 'https://siliconafrica.co'
  },
  {
    id: 'res-6',
    channel: 'Forums',
    source: 'Nairaland Tech Community',
    sourceDomain: 'nairaland.com',
    title: 'Real-world speed tests: Comparing 5G speeds in Ikeja, Abuja and Port Harcourt',
    excerpt: 'Over 80 community members share latency pings, average throughput benchmarks, and indoor router performance across different base stations.',
    date: '7 hrs ago',
    author: 'CyberNaija_Mod',
    sentiment: 'Neutral',
    reach: '45K views',
    tags: ['Community', 'SpeedTests', 'Forums'],
    location: 'Nationwide',
    language: 'English',
    url: 'https://nairaland.com'
  }
];

export const STORY_CLUSTERS = [
  {
    id: 'story-1',
    title: 'Network performance',
    clusterType: 'Story cluster',
    updatedAt: '2m ago',
    summary: 'Multiple sources are discussing intermittent connectivity and service recovery across Lagos, with reports of resolved optical fiber rerouting.',
    tags: ['Network', 'Lagos', 'Service quality'],
    mentions: 342,
    sourcesCount: 46,
    velocity: '+48%',
    category: 'Trending',
    sentiment: 'Neutral',
    articles: [
      { source: 'BusinessDay', title: 'Fiber repair crews restore redundancy along Lekki corridor', time: '12m ago' },
      { source: 'X / Twitter', title: 'Users report restored 4G/5G speeds in Victoria Island and Ikoyi', time: '18m ago' },
      { source: 'TechCabal', title: 'Subsea cable redundancy prevents prolonged downtime for major telcos', time: '45m ago' }
    ]
  },
  {
    id: 'story-2',
    title: 'New service initiative',
    clusterType: 'Story cluster',
    updatedAt: '5m ago',
    summary: 'MTN Nigeria announced a new infrastructure programme focused on network resilience, capacity expansion, and high-density coverage.',
    tags: ['Infrastructure', 'Investment', 'Coverage'],
    mentions: 127,
    sourcesCount: 18,
    velocity: '+52%',
    category: 'Latest',
    sentiment: 'Positive',
    articles: [
      { source: 'TechCabal', title: 'MTN Nigeria rolls out billion-naira service enhancement drive', time: '5m ago' },
      { source: 'The Guardian', title: 'Broadband penetration targets receive boost from infrastructure rollout', time: '30m ago' }
    ]
  },
  {
    id: 'story-3',
    title: '5G coverage experiences',
    clusterType: 'Emerging signal',
    updatedAt: '34m ago',
    summary: 'Public forum conversations compare speeds, reliability and availability in major commercial districts across Abuja and Lagos.',
    tags: ['5G', 'Abuja', 'Speed'],
    mentions: 74,
    sourcesCount: 8,
    velocity: '+64%',
    category: 'Emerging',
    sentiment: 'Positive',
    articles: [
      { source: 'Nairaland', title: 'Independent speed tests: 5G throughput exceeds 450Mbps in Maitama', time: '34m ago' },
      { source: 'Reddit / r/Nigeria', title: 'Home router 5G experiences in Wuse 2 vs Garki', time: '1h ago' }
    ]
  },
  {
    id: 'story-4',
    title: 'Cybersecurity vulnerability advisory',
    clusterType: 'Story cluster',
    updatedAt: '1h ago',
    summary: 'Specialist technical forums discuss a newly patched zero-day exploit impacting enterprise VPN gateways used across regional institutions.',
    tags: ['Infosec', 'Vulnerability', 'Patch'],
    mentions: 216,
    sourcesCount: 32,
    velocity: '+28%',
    category: 'Most Mentioned',
    sentiment: 'Critical',
    articles: [
      { source: 'BleepingComputer', title: 'Emergency patch issued for enterprise SSL VPN gateways', time: '1h ago' },
      { source: 'The Register', title: 'IT administrators urged to deploy priority security updates immediately', time: '2h ago' }
    ]
  }
];

export const ALERTS_DATA = [
  {
    id: 'alert-1',
    priority: 'High',
    timeAgo: '2 min ago',
    title: '342 new mentions detected for MTN Nigeria',
    description: 'Most new mentions relate to network performance in Lagos following planned maintenance.',
    isUnread: true,
    topic: 'MTN Nigeria'
  },
  {
    id: 'alert-2',
    priority: 'High',
    timeAgo: '8 min ago',
    title: 'Network outage is trending',
    description: 'Discussion velocity is 48% above the normal twenty-minute baseline.',
    isUnread: true,
    topic: 'MTN Nigeria'
  },
  {
    id: 'alert-3',
    priority: 'Normal',
    timeAgo: '18 min ago',
    title: 'New article detected from a major source',
    description: 'TechCabal published an in-depth report about the telecom infrastructure initiative.',
    isUnread: true,
    topic: 'MTN Nigeria'
  },
  {
    id: 'alert-4',
    priority: 'Normal',
    timeAgo: '1 hr ago',
    title: 'Cybersecurity monitor has 216 new mentions',
    description: 'A new software vulnerability is emerging across technical forums and disclosure channels.',
    isUnread: false,
    topic: 'Cybersecurity'
  },
  {
    id: 'alert-5',
    priority: 'Critical',
    timeAgo: '3 hrs ago',
    title: 'Critical CVE advisory affecting financial gateway software',
    description: 'High CVSS score (9.8) security alert highlighted by multiple security researchers.',
    isUnread: false,
    topic: 'Cybersecurity'
  }
];

export const ANALYTICS_DATA = {
  '24 hours': {
    mentionVolume: '12,482',
    growth: '↗ 18.2%',
    activeSources: 328,
    timeLabels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'],
    volumeValues: [1200, 850, 2100, 3400, 4200, 3100, 2800],
    sources: { news: 38, social: 34, web: 28 },
    tone: { positive: 62, neutral: 26, negative: 12 },
    comparisonText: 'Comparing last 24 hours with the previous day'
  },
  '7 days': {
    mentionVolume: '34,190',
    growth: '↗ 14.5%',
    activeSources: 412,
    timeLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    volumeValues: [4200, 4800, 5600, 6100, 5300, 3900, 4290],
    sources: { news: 40, social: 32, web: 28 },
    tone: { positive: 60, neutral: 28, negative: 12 },
    comparisonText: 'Comparing 7 days with the previous week'
  },
  '30 days': {
    mentionVolume: '48,906',
    growth: '↗ 9.7%',
    activeSources: 512,
    timeLabels: ['1 Jun', '5 Jun', '10 Jun', '15 Jun', '20 Jun', '25 Jun', '30 Jun'],
    volumeValues: [6800, 7200, 8100, 6900, 7500, 8400, 9200],
    sources: { news: 38, social: 34, web: 28 },
    tone: { positive: 59, neutral: 29, negative: 12 },
    comparisonText: 'Comparing 30 days with the previous period'
  },
  '90 days': {
    mentionVolume: '142,318',
    growth: '↗ 13.4%',
    activeSources: 784,
    timeLabels: ['Apr', 'Mid Apr', 'May', 'Mid May', 'Jun', 'Mid Jun', 'Now'],
    volumeValues: [18000, 22000, 25000, 21000, 27000, 29000, 31000],
    sources: { news: 38, social: 34, web: 28 },
    tone: { positive: 55, neutral: 31, negative: 14 },
    comparisonText: 'Comparing 90 days with the previous period'
  }
};
