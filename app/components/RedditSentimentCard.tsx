'use client'

import { useState, useEffect } from 'react'
import { RedditSentimentData } from '@/lib/types'
import { formatMentions, formatRelativeTime, getSentimentColor, formatRedditScore, SUBREDDIT_COLORS } from '@/lib/utils'

interface RedditSentimentCardProps {
  symbol: string
}

export default function RedditSentimentCard({ symbol }: RedditSentimentCardProps) {
  const [period, setPeriod] = useState<'24h' | '7d'>('24h')
  const [data24h, setData24h] = useState<RedditSentimentData | null>(null)
  const [data7d, setData7d] = useState<RedditSentimentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/reddit-sentiment/${symbol}`)
        if (response.ok) {
          const result = await response.json()
          setData24h(result.data24h)
          setData7d(result.data7d)
        } else {
          setError('Failed to fetch Reddit data')
        }
      } catch (err) {
        console.error('Failed to fetch Reddit sentiment:', err)
        setError('Failed to fetch Reddit data')
      } finally {
        setLoading(false)
      }
    }
    fetchSentiment()
  }, [symbol])

  const currentData = period === '24h' ? data24h : data7d

  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
              </svg>
            </div>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Reddit Sentiment</h3>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-16 rounded-lg skeleton" />
          <div className="h-24 rounded-lg skeleton" />
          <div className="h-20 rounded-lg skeleton" />
        </div>
      </div>
    )
  }

  if (error || !currentData) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
            </svg>
          </div>
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Reddit Sentiment</h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No Reddit data available for {symbol}
        </p>
      </div>
    )
  }

  const sentimentColors = getSentimentColor(currentData.sentiment)
  const scoreInfo = formatRedditScore(currentData.redditScore)
  const maxMentions = Math.max(...currentData.subredditBreakdown.map(s => s.mentionCount), 1)

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
            </svg>
          </div>
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Reddit Sentiment</h3>
        </div>
        {/* Period Toggle */}
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setPeriod('24h')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              period === '24h'
                ? 'bg-orange-500 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            style={period !== '24h' ? { color: 'var(--text-secondary)' } : {}}
          >
            24H
          </button>
          <button
            onClick={() => setPeriod('7d')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              period === '7d'
                ? 'bg-orange-500 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            style={period !== '7d' ? { color: 'var(--text-secondary)' } : {}}
          >
            7D
          </button>
        </div>
      </div>

      {/* Reddit Score */}
      <div className="flex items-center justify-between p-4 rounded-xl mb-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Reddit Score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-orange-500">{currentData.redditScore}</span>
            <span className={`text-sm font-medium ${scoreInfo.color}`}>{scoreInfo.text}</span>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg ${sentimentColors.bg}`}>
          <span className={`text-sm font-medium ${sentimentColors.text}`}>
            {sentimentColors.icon} {currentData.sentiment}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatMentions(currentData.totalMentions)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mentions</p>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatMentions(currentData.totalUpvotes)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Upvotes</p>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatMentions(currentData.totalComments)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Comments</p>
        </div>
      </div>

      {/* Subreddit Breakdown */}
      {currentData.subredditBreakdown.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            Subreddit Breakdown
          </p>
          <div className="space-y-2">
            {currentData.subredditBreakdown
              .filter(sub => sub.mentionCount > 0)
              .sort((a, b) => b.mentionCount - a.mentionCount)
              .map((sub) => (
                <div key={sub.subreddit} className="flex items-center gap-2">
                  <span className="text-xs w-24 truncate" style={{ color: 'var(--text-secondary)' }}>
                    r/{sub.subreddit}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(sub.mentionCount / maxMentions) * 100}%`,
                        backgroundColor: SUBREDDIT_COLORS[sub.subreddit] || '#FF4500',
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right" style={{ color: 'var(--text-secondary)' }}>
                    {sub.mentionCount}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top Posts */}
      {currentData.topPosts.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            Top Posts
          </p>
          <div className="space-y-2">
            {currentData.topPosts.slice(0, 3).map((post) => (
              <a
                key={post.id}
                href={`https://reddit.com${post.permalink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <p className="text-xs line-clamp-2 mb-1" style={{ color: 'var(--text-primary)' }}>
                  {post.title}
                </p>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    {formatMentions(post.score)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    {post.num_comments}
                  </span>
                  <span>r/{post.subreddit}</span>
                  <span>{formatRelativeTime(post.created_utc)}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Attribution */}
      <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <svg className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
          </svg>
          Data from r/wallstreetbets, r/stocks, r/investing, r/options
        </p>
      </div>
    </div>
  )
}
