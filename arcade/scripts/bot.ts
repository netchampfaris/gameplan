// A stand-in player for testing the Arcade alone: it signs in as a real user, joins
// the Common Room, wanders, chats and emotes.
//
//   yarn arcade:bot                                  # as arcade.two@example.com
//   yarn arcade:bot --user arcade.three@example.com  # a second bot, in another terminal
//   yarn arcade:bot --site other.localhost --password secret
//
// Needs the bench running (web server and socket.io). The test users are listed in
// arcade/AGENTS.md. Stop with Ctrl+C; the bot leaves the Room on the way out.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { parseArgs } from 'node:util'
import { defaultAppearance } from '../avatar/catalog.ts'
import { ArcadeNet } from '../net/ArcadeNet.ts'
import { EMOTES, type Pose } from '../net/protocol.ts'
import type { Facing } from '../world/interactables.ts'

const { values: args } = parseArgs({
  options: {
    site: { type: 'string', default: process.env.ARCADE_SITE ?? 'gameplan-arcade.localhost' },
    user: { type: 'string', default: 'arcade.two@example.com' },
    password: { type: 'string', default: 'qwe' },
  },
})
const site = args.site
const user = args.user

const benchConfig = JSON.parse(
  readFileSync(new URL('../../../../sites/common_site_config.json', import.meta.url), 'utf8'),
) as { webserver_port?: number; socketio_port?: number }
const webPort = benchConfig.webserver_port ?? 8000
const socketPort = benchConfig.socketio_port ?? 9000

// socket.io-client is a frontend dependency; the app root has no node_modules.
const requireFromFrontend = createRequire(new URL('../../frontend/package.json', import.meta.url))
const { io } = requireFromFrontend('socket.io-client') as typeof import('socket.io-client')

// Walkable ground, from the same map the game loads.
interface TiledLayer {
  name: string
  type: string
  data?: number[]
  objects?: { name: string; x: number; y: number }[]
}
const map = JSON.parse(readFileSync(new URL('../data/maps/world.json', import.meta.url), 'utf8')) as {
  width: number
  height: number
  tilewidth: number
  layers: TiledLayer[]
}
const TILE = map.tilewidth
const collision = map.layers.find((layer) => layer.name === 'Collision')?.data ?? []
const spawn = map.layers
  .find((layer) => layer.name === 'Spawn Points')
  ?.objects?.find((object) => object.name === 'spawn-center') ?? { x: (map.width * TILE) / 2, y: (map.height * TILE) / 2 }

function walkable(x: number, y: number): boolean {
  const column = Math.floor(x / TILE)
  const row = Math.floor(y / TILE)
  if (column < 0 || row < 0 || column >= map.width || row >= map.height) return false
  return !collision[row * map.width + column]
}

const LINES = [
  'Morning, everyone',
  'Anyone up for coffee?',
  'Just shipped a fix, feels good',
  'This room is cosy',
  'Back in five',
  'Has anyone seen the release notes?',
  'Lunch at one?',
  'Nice outfit!',
]

const SPEED = 150
const TICK_MS = 50

async function login(): Promise<string> {
  const response = await fetch(`http://127.0.0.1:${webPort}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Frappe-Site-Name': site },
    body: JSON.stringify({ usr: user, pwd: args.password }),
  })
  const sid = response.headers
    .getSetCookie()
    .map((cookie) => /^sid=([^;]+)/.exec(cookie)?.[1])
    .find((value) => value && value !== 'Guest')
  if (!response.ok || !sid) throw new Error(`Could not sign in as ${user} on ${site} (HTTP ${response.status})`)
  return sid
}

const random = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]

const sid = await login()
const origin = `http://${site}:${webPort}`
const socket = io(`http://127.0.0.1:${socketPort}/${site}`, {
  transports: ['websocket'],
  // Frappe's socket server checks that Host and Origin name the same site.
  extraHeaders: { Cookie: `sid=${sid}`, Origin: origin, Host: site, 'X-Frappe-Site-Name': site },
})
const net = new ArcadeNet(socket)
const names = new Map<string, string>()

net.events.on('snapshot', ({ self, occupants }) => {
  console.log(`${self.fullName} joined the Common Room with ${occupants.length} others`)
  for (const occupant of occupants) names.set(occupant.id, occupant.fullName)
})
net.events.on('joined', (occupant) => {
  names.set(occupant.id, occupant.fullName)
  console.log(`+ ${occupant.fullName}`)
})
net.events.on('left', ({ id }) => {
  console.log(`- ${names.get(id) ?? id}`)
  names.delete(id)
})
net.events.on('said', ({ id, text }) => console.log(`${names.get(id) ?? id}: ${text}`))
net.events.on('emoted', ({ id, emote }) => console.log(`${names.get(id) ?? id} ${emote}`))
net.events.on('error', ({ message }) => console.error(`! ${message}`))
socket.on('connect_error', (error) => console.error(`! ${error.message}`))

const pose: Pose = { x: spawn.x + random(-48, 48), y: spawn.y + random(-48, 48), facing: 'down', state: 'idle' }
const result = await net.join('common', defaultAppearance(user), pose)
if (!result.ok) {
  socket.close()
  process.exit(1)
}

let target: { x: number; y: number } | null = null
let restUntil = Date.now() + random(500, 2000)
let nextLine = Date.now() + random(4000, 10000)
let nextEmote = Date.now() + random(3000, 8000)

setInterval(() => {
  const now = Date.now()
  if (now > nextLine) {
    net.say(pick(LINES))
    nextLine = now + random(8000, 20000)
  }
  if (now > nextEmote) {
    net.emote(pick(EMOTES))
    nextEmote = now + random(6000, 15000)
  }

  if (!target) {
    if (now < restUntil) return
    const x = pose.x + random(-4, 4) * TILE
    const y = pose.y + random(-4, 4) * TILE
    if (walkable(x, y)) target = { x, y }
    return
  }

  const dx = target.x - pose.x
  const dy = target.y - pose.y
  const distance = Math.hypot(dx, dy)
  const step = (SPEED * TICK_MS) / 1000
  const facing: Facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
  const x = distance <= step ? target.x : pose.x + (dx / distance) * step
  const y = distance <= step ? target.y : pose.y + (dy / distance) * step
  if (distance <= step || !walkable(x, y)) {
    target = null
    restUntil = now + random(1000, 4000)
    Object.assign(pose, { state: 'idle', facing })
  } else {
    Object.assign(pose, { x, y, state: 'walk', facing })
  }
  net.sendPose({ ...pose })
}, TICK_MS)

process.on('SIGINT', () => {
  net.destroy()
  socket.close()
  process.exit(0)
})
