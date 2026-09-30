/**
 * Gameplan's handlers on Frappe's socket.io server.
 *
 * Frappe requires `apps/<app>/realtime/handlers.js` once and calls it for every new
 * socket (see `apps/frappe/realtime/index.js`). With `developer_mode` on, the Arcade
 * module is loaded fresh for each new socket, so an edit to `arcade.js` applies on the
 * next page load without restarting the server. Presence lives on the namespace, not in
 * the module, so it survives that reload.
 */
const { get_conf } = require('../../frappe/node_utils')

const reloadOnConnect = Boolean(get_conf().developer_mode)
const ARCADE = require.resolve('./arcade')

module.exports = function gameplanHandlers(socket) {
  if (reloadOnConnect) delete require.cache[ARCADE]
  require(ARCADE)(socket)
}
