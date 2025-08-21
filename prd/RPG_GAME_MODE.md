# Gameplan RPG Game Mode

## Overview & Concept

A 2D pixel art RPG-style social game mode integrated into Gameplan as a separate page. This casual, fun feature allows team members to interact with each other through customizable characters in a virtual world, providing a social break from work discussions.

**Core Concept:**
- Separate page within the existing Gameplan Vue.js app
- Canvas-based 2D rendering using HTML5 Canvas
- Real-time multiplayer showing all online users as characters
- Pixel art retro visual style using LimeZu Modern Interiors assets
- Social/casual focus - not work-related gamification

---

## Game Mechanics
Core systems that define how players move, interact, and experience the virtual world.

### Movement System
- **Grid-based movement** - 48x48 pixel tiles matching LimeZu asset dimensions
- **Walk/run modes** - toggle run with Shift key for faster movement
- **Stamina system** - stamina depletes while running, restores when standing/walking
- **Collision enabled** - characters cannot walk through each other, creates natural gathering
- **Persistent world** - items, decorations, and changes remain between sessions

### Interaction System
- **One-tile radius** - must be adjacent (directly next to) another character to interact
- **Dual chat system**:
  - **Speech bubbles** - quick local messages visible to nearby players (temporary)
  - **Persistent chatbox** - sidebar chat for ongoing conversations (stays between sessions)
- **Chat history** - all conversations saved and accessible across sessions
- **Seamless switching** - easy toggle between bubble chat and persistent chat

### Social Features
- **AFK detection** - idle animations after inactivity
- **Status indicators** - show availability, mood, current activity
- **Group formations** - temporary groups for activities or conversations
- **Gesture animations** - wave, dance, high-five between characters
- **Discovery elements** - hidden interactions and easter eggs throughout the world

---

## World Layout
Different themed areas designed for specific types of social interactions and activities.

### Common Area
Central welcoming hub where everyone spawns and naturally gathers for casual interactions.

- **Central focal point** - coffee bar, fountain, or cozy fireplace as main gathering spot
- **Multiple conversation zones**:
  - **Intimate spaces** - 2-3 person seating areas (small couches, chairs)
  - **Group areas** - larger spaces for team gatherings (conference tables, lounge areas)
  - **Standing zones** - high tables, casual meeting spots for quick chats
- **Clear navigation pathways** - obvious routes to other areas (game room, personal spaces)
- **Comfortable furniture** - couches, armchairs, coffee tables from LimeZu collection
- **Visual warmth and invitation**:
  - **Plants and greenery** - potted plants, small gardens for organic feel
  - **Soft lighting elements** - lamps, warm overhead lighting (not harsh)
  - **Welcoming color palette** - warm tones from LimeZu modern interiors
  - **Decorative touches** - artwork, bookshelves, personal elements
- **Spawn point** - designated comfortable area where new players first appear
- **Activity indicators** - subtle visual cues showing where conversations are happening

### Game Room
Dedicated space for mini-games and structured activities between players.

- **Gaming tables** - surfaces for different types of games
- **Scoreboard displays** - show current and recent game results
- **Spectator seating** - areas for watching ongoing games
- **Game selection interface** - choose which mini-game to play
- **Tournament areas** - special spaces for organized competitions

### Event Areas
Special zones that transform and activate for scheduled team gatherings and celebrations.

- **Flexible layout** - spaces that can be reconfigured for different events
- **Event decorations** - seasonal themes, celebration elements
- **Presentation areas** - spaces for announcements and team meetings
- **Special lighting** - enhanced ambiance during events
- **Memory displays** - show recent events and upcoming schedules

### Personal Spaces
Individual customizable rooms where players can express creativity and host private gatherings.

- **Apartment building system** - floors with numbered doors for each user
- **Activity indicators** - lights on, music playing to show who's home
- **Customizable rooms** - drag-and-drop furniture placement using LimeZu assets
- **Room themes** - cozy cabin, modern apartment, fantasy castle, space station
- **Furniture variety** - beds, desks, plants, decorations from collectibles
- **Social features**:
  - **Visit system** - browse directory or type username to visit friends
  - **Guest book** - visitors can leave messages or drawings
  - **Open house mode** - make your space publicly visitable
  - **House parties** - special events with multiple visitors

---

## Mini-Games
Simple multiplayer games that players can enjoy together when they interact.

### Two-Player Games
- **Rock Paper Scissors** - classic quick game with animated gestures
- **Tic-Tac-Toe** - strategic grid game with persistent board state
- **Coin Flip** - simple chance-based game with celebration animations
- **Number Guessing** - one player thinks of a number, other guesses

### Puzzle Games
- **Jigsaw Puzzles** - collaborative puzzle solving
- **Word Association** - creative word chain games
- **Riddle Challenges** - brain teasers players can share

### Game Mechanics
- **Game invitations** - players can invite nearby friends to play
- **Turn-based system** - clear indicators of whose turn it is
- **Winner celebrations** - special animations and reactions
- **Spectator mode** - others can watch ongoing games
- **Game history** - track wins/losses casually (not competitive)

---

## Character Customization
Personal expression through avatar appearance and unlockable cosmetic items.

### Basic Customization
- **Character sprites** - multiple base characters from LimeZu asset pack
- **Outfit variations** - different clothing styles and colors available
- **Walking animations** - smooth movement with directional sprites
- **Facial expressions** - change based on recent interactions and mood

### Unlockable Content
- **Seasonal outfits** - special themed clothing for holidays and events
- **Accessories** - hats, glasses, bags, magical effects
- **Earned through social interaction** - not work achievements
- **Achievement badges** - for various social activities and milestones
- **Rare items** - special cosmetics from events or daily collectibles

---

## Collectibles
Daily items scattered throughout the world that encourage exploration and regular engagement.

### Daily Drops
- **Random spawning** - 5-10 items appear randomly each day
- **Exploration incentive** - items hidden in different areas of the world
- **Variety of items** - cosmetic accessories, decorative objects, pet toys
- **Rarity levels** - common, uncommon, rare items with different spawn rates

### Item Types
- **Cosmetic accessories** - hats, clothing items, character decorations
- **Room decorations** - furniture, artwork, plants for personal spaces
- **Pet items** - toys, accessories, food for virtual companions
- **Special effects** - magical auras, particle effects, unique animations
- **Seasonal items** - holiday-themed collectibles and decorations

### Collection Mechanics
- **Inventory system** - organized storage for collected items
- **Display options** - showcase rare items in personal spaces
- **Trading potential** - future feature for item exchange between players
- **Collection achievements** - badges for finding certain numbers or types of items

---

## Music Zone
Shared listening experiences where players can discover music together and host virtual listening parties.

### Playlist Sharing
- **DJ functionality** - players can queue and control music for the area
- **Playlist integration** - connect with Spotify, YouTube, or other music services
- **Queue system** - collaborative playlists where multiple people can add songs
- **Music discovery** - learn about colleagues' music tastes

### Social Features
- **Listening parties** - gather around speakers to enjoy music together
- **Dance animations** - characters can dance and react to the music
- **Music chat** - discuss songs and share music recommendations
- **DJ rotation** - take turns being the DJ for different sessions

---

## Pets & Companions
Virtual pets that follow players around and add charm and personality to interactions.

### Pet Types
- **Cats and dogs** - classic companion animals with different breeds
- **Fantasy creatures** - dragons, sprites, magical companions
- **Robot pets** - futuristic mechanical companions
- **Seasonal pets** - special holiday-themed creatures

### Pet Features
- **Following behavior** - pets follow their owner around the world
- **Pet interactions** - pets can play with each other when owners are nearby
- **Customization** - different colors, accessories, and appearance options
- **Pet care** - simple feeding and playing mechanics
- **Pet housing** - special areas in personal spaces where pets can roam

---

## Event System
Scheduled gatherings and special occasions that bring the community together for shared experiences.

### Event Types
- **Team meetings** - scheduled work discussions in designated areas
- **Social hours** - casual hangout times (lunch breaks, Friday socials)
- **Holiday celebrations** - seasonal events with special decorations and activities
- **Community contests** - room decoration contests, costume competitions

### Event Features
- **Event notifications** - advance announcements like "Coffee break starting in 5 minutes!"
- **Dynamic decorations** - rooms transform with themes, special lighting, seasonal elements
- **Special activities** - event-exclusive mini-games or collectibles
- **Event memory** - areas remember and display information about recent and upcoming events
- **RSVP system** - players can indicate attendance for planning purposes

---

## Technical Details

**Tech Stack:**
- Frontend: Vue.js 3 with HTML5 Canvas API
- Real-time: WebSocket (existing Gameplan infrastructure)  
- Backend: Minimal API endpoints for user state and chat persistence
- Assets: LimeZu Modern Interiors pack (48x48 pixel sprites)

**Development Prerequisites:**
- HTML5 Canvas API and 2D rendering
- WebSocket real-time communication
- Basic 2D game loop (update/render cycle)
- Sprite atlas handling and animation systems
- Grid-based collision detection
- LimeZu asset organization and sprite sheet parsing

**Performance Considerations:**
- Optimize Canvas rendering for 20+ concurrent users
- Efficient WebSocket message handling for movement and chat
- Sprite batching and caching for smooth animations
- Movement prediction and interpolation for responsive feel

**Integration Points:**
- Same user accounts as existing Gameplan profiles
- Shared authentication system
- WebSocket infrastructure for real-time updates
- Database integration for chat persistence and user preferences

---

## Features by Development Difficulty

### Easy
1. Basic 2D world with LimeZu assets
2. Character movement (grid-based walk/run with WASD)
3. Real-time multiplayer (see other online users)
4. User authentication integration
5. Basic character sprites with walking animations

### Easy-Medium
6. Proximity chat with speech bubbles
7. Simple interactions (wave gesture, emoji reactions)
8. Collision detection between characters
9. Persistent chatbox with session history
10. Username display above characters
11. Common area design with furniture

### Medium
12. Stamina system for running
13. Basic character customization (outfit variations)
14. AFK detection with idle animations
15. Event system with notifications
16. Game room area setup

### Medium-Hard
17. Mini-games (rock paper scissors, tic-tac-toe)
18. Daily collectibles system
19. Enhanced customization with unlockables
20. Pets & companions with following behavior

### Hard
21. Music zone with playlist integration
22. Personal spaces with furniture placement
23. Advanced mini-games and tournaments
24. Complex event decorations and transformations