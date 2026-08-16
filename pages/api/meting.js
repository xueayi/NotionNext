/**
 * 音乐歌单代理 API（Meting 兼容）
 * 服务端拉取网易云歌单，转换为播放器可用的列表格式，避免客户端跨域问题。
 * 用法: /api/meting?server=netease&type=playlist&id=<歌单ID>
 */
export default async function handler(req, res) {
  const { server = 'netease', type = 'playlist', id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'missing id' })
  }
  if (server !== 'netease') {
    return res.status(400).json({ error: 'only netease supported' })
  }
  if (type !== 'playlist') {
    return res.status(400).json({ error: 'only playlist supported' })
  }

  try {
    const detailRes = await fetch(
      `https://music.163.com/api/v6/playlist/detail?id=${encodeURIComponent(id)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          Referer: 'https://music.163.com/'
        }
      }
    )
    if (!detailRes.ok) {
      return res.status(502).json({ error: `netease api ${detailRes.status}` })
    }
    const data = await detailRes.json()
    if (data?.code !== 200 || !data?.playlist?.tracks) {
      return res.status(502).json({ error: 'netease api bad response' })
    }

    const list = data.playlist.tracks.map((t) => ({
      name: t.name || '',
      artist: (t.ar || []).map((a) => a.name).join(' / '),
      url: `https://music.163.com/song/media/outer/url?id=${t.id}.mp3`,
      cover: t.al?.picUrl || ''
    }))

    // 缓存 1 小时，减少对网易云的请求
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.status(200).json(list)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}
