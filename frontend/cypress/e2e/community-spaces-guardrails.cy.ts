// Phase 07 coverage: the scoped new-space flow always creates in the current
// community (no community picker), and the global /spaces page is admin-only —
// non-admins are redirected away and never see the rail Spaces icon.
describe('Community spaces guardrails', () => {
  const community = 'engineering'

  beforeEach(() => {
    cy.login()
    cy.request({
      method: 'POST',
      url: '/api/method/gameplan.test_api.clear_data',
    })

    // One public community with a space, so it is a valid landing destination
    // and the scoped-route guard does not 404.
    cy.request('POST', '/api/method/frappe.client.insert_many', {
      docs: [
        { doctype: 'GP Team', title: 'Engineering' },
        { doctype: 'GP Project', title: 'Gameplan', team: community },
      ],
    })

    // Join it so it appears in the active community list and the sidebar renders.
    cy.request('POST', '/api/v2/method/GP Team/update_joined_teams', {
      teams: [community],
    })
  })

  it('admin: sidebar "+" opens a community-locked new-space flow that creates in the current community', () => {
    cy.visit(`/g/community/${community}/discussions`)

    // The sidebar "Spaces" header reveals an admin-only "+" (aria-label "New space").
    cy.iconButton('New space').click()

    // The dialog opens in locked mode: title shown, community picker hidden.
    cy.scope('dialog').contains('New Space').should('be.visible')
    cy.get('input[placeholder="Community"]').should('not.exist')

    cy.scope('dialog').find('#new-space-name').type('Platform')
    cy.scope('dialog').button('Submit').click()

    // Dialog closes and the new space lands in the current community's sidebar.
    cy.scope('dialog').should('not.exist')
    cy.contains('a', 'Platform')
      .should('have.attr', 'href')
      .and('include', `/community/${community}/space/`)
  })

  it('non-admin: /spaces redirects away and the rail Spaces icon is absent', () => {
    // Give the non-admin (john, a Gameplan Member created by clear_data) a password
    // so we can log in as them.
    cy.request('POST', '/api/method/frappe.client.set_value', {
      doctype: 'User',
      name: 'john@example.com',
      fieldname: 'new_password',
      value: 'gameplan123',
    })

    // Log in as the non-admin and join the community so home resolves to discussions.
    cy.login('john@example.com', 'gameplan123')
    cy.request('POST', '/api/v2/method/GP Team/update_joined_teams', {
      teams: [community],
    })

    cy.visit('/g/spaces')

    // Redirected away from the admin-only page.
    cy.url().should('not.include', '/spaces')
    cy.url().should('include', `/community/${community}/discussions`)

    // The rail Spaces icon (lucide-layout-grid) is hidden for non-admins.
    cy.get('.lucide-layout-grid').should('not.exist')
  })
})
