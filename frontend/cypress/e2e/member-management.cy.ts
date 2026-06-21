// Member-management coverage: the admin happy paths for inviting a member
// (gameplan.api.invite_by_email), changing a member's role (change_user_role)
// and removing a member (remove_user), plus the authorization boundary.
//
// Boundary note: the Settings > Members/Invites UI is intentionally NOT hidden
// from non-admins — AppDropdown and SettingsDialog render their controls
// unconditionally. The real protection is server-side `require_admin()` in
// gameplan/api.py, which throws PermissionError (HTTP 403). So the non-admin
// test below asserts defense-in-depth: the control is reachable, but the
// request is rejected and nothing changes. The backend rule itself is unit
// tested in gameplan/tests/test_api_security.py — this spec is the UI layer.
describe('Member management', () => {
  const community = 'engineering'

  beforeEach(() => {
    cy.login()
    cy.request({
      method: 'POST',
      url: '/api/method/gameplan.test_api.clear_data',
    })
    cy.clearLocalStorage()

    // clear_data keeps (never resets) existing users, so john carries over any
    // role/enabled changes from a prior run. Normalize him to an enabled member
    // here so every test starts from a known state.
    cy.request('POST', '/api/method/frappe.client.set_value', {
      doctype: 'User',
      name: 'john@example.com',
      fieldname: 'enabled',
      value: 1,
    })
    cy.request('POST', '/api/v2/method/gameplan.api.change_user_role', {
      user: 'john@example.com',
      role: 'Gameplan Member',
    })

    // A joined public community + space gives the desktop shell a valid landing
    // route, so the sidebar (and its "Gameplan" app dropdown) renders.
    cy.request('POST', '/api/method/frappe.client.insert_many', {
      docs: [
        { doctype: 'GP Team', title: 'Engineering' },
        { doctype: 'GP Project', title: 'General', team: community },
      ],
    })
    cy.request('POST', '/api/v2/method/GP Team/update_joined_teams', {
      teams: [community],
    })
  })

  // Opens the global Settings dialog via the sidebar app dropdown. It always
  // opens on the first tab (Members).
  function openSettings() {
    cy.visit(`/g/community/${community}/discussions`)
    cy.contains('button', 'Gameplan').click()
    cy.contains('[role="menuitem"]', 'Settings').click()
    cy.scope('dialog').contains('h1', 'Settings').should('be.visible')
  }

  // Opens the role dropdown for the member matching `email` and clicks an option.
  // `currentRole` is the label currently shown on the dropdown trigger.
  function openRoleMenu(email: string, currentRole: string) {
    cy.scope('dialog').find('input[placeholder="Search"]').clear().type(email.split('@')[0])
    cy.scope('dialog')
      .contains('li', email)
      .within(() => {
        cy.contains('button', currentRole).click()
      })
  }

  it('admin can invite a member by email', () => {
    cy.intercept('POST', '**/gameplan.api.invite_by_email').as('invite')
    openSettings()
    cy.scope('dialog').contains('button', 'Invites').click()

    // Typing an email reveals the role Select (defaults to Member) + submit button.
    cy.scope('dialog').find('textarea').type('newteammate@example.com')
    cy.button('Send invitation').click()
    cy.wait('@invite').its('response.statusCode').should('eq', 200)

    // On success the form resets and the new invite shows in "Pending Invites".
    cy.scope('dialog').contains('newteammate@example.com').should('be.visible')
    cy.scope('dialog').contains('(Member)').should('be.visible')
  })

  it('admin can change a member’s role', () => {
    openSettings()

    openRoleMenu('john@example.com', 'Member')
    cy.get('.menu-content, .dropdown-content').contains('button', 'Admin').click()

    // change_user_role swaps the single Gameplan role, so a confirm step gates it.
    cy.button('Change Role').click()

    // The trigger label reflects the new role.
    cy.scope('dialog')
      .contains('li', 'john@example.com')
      .contains('button', 'Admin')
      .should('exist')
  })

  it('admin can remove a member', () => {
    openSettings()

    openRoleMenu('john@example.com', 'Member')
    cy.get('.menu-content, .dropdown-content').contains('button', 'Remove').click()
    cy.button('Remove User').click()

    // remove_user disables the account, so it drops out of the active members list.
    cy.scope('dialog').contains('li', 'john@example.com').should('not.exist')
  })

  it('non-admin cannot escalate their own role (control reachable, request rejected)', () => {
    // Give the seeded non-admin (john, a Gameplan Member) a password to log in as.
    cy.request('POST', '/api/method/frappe.client.set_value', {
      doctype: 'User',
      name: 'john@example.com',
      fieldname: 'new_password',
      value: 'gameplan123',
    })
    cy.login('john@example.com', 'gameplan123')
    cy.request('POST', '/api/v2/method/GP Team/update_joined_teams', {
      teams: [community],
    })
    cy.clearLocalStorage()

    cy.intercept('POST', '**/gameplan.api.change_user_role').as('changeRole')

    openSettings()

    // The UI does not hide the control from non-admins — that is by design;
    // enforcement is server-side.
    openRoleMenu('john@example.com', 'Member')
    cy.get('.menu-content, .dropdown-content').contains('button', 'Admin').click()
    cy.button('Change Role').click()

    // Server rejects the privilege escalation and the role stays "Member".
    cy.wait('@changeRole').its('response.statusCode').should('eq', 403)
    cy.scope('dialog')
      .contains('li', 'john@example.com')
      .contains('button', 'Member')
      .should('exist')
  })
})
