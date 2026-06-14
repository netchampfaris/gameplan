// High-order coverage for the Community naming alignment (Phase 04):
// canonical `/community/:communityId/discussions` routing, the rail community
// switcher persisting the deliberate choice, and deep links NOT overwriting the
// persisted home community.
describe('Community naming alignment', () => {
  const first = 'marketing'
  const second = 'product'

  beforeEach(() => {
    cy.login()
    cy.request({
      method: 'POST',
      url: '/api/method/gameplan.test_api.clear_data',
    })

    // Two public communities, each with a space, so both are valid landing destinations.
    cy.request('POST', '/api/method/frappe.client.insert_many', {
      docs: [
        { doctype: 'GP Team', title: 'Marketing' },
        { doctype: 'GP Team', title: 'Product' },
        { doctype: 'GP Project', title: 'Campaigns', team: first },
        { doctype: 'GP Project', title: 'Roadmap', team: second },
      ],
    })

    // Join both communities so they appear in the active community list / switcher.
    cy.request('POST', '/api/v2/method/GP Team/update_joined_teams', {
      teams: [first, second],
    })
  })

  it('lands on a canonical community discussions URL', () => {
    cy.visit('/g')
    cy.url().should('match', /\/community\/[^/]+\/discussions/)
  })

  // The rail switcher uses a custom `#trigger` slot, so its trigger is the rail
  // "More communities" button; clicking it mounts the searchable input.
  function switchCommunity(optionLabel: string) {
    cy.iconButton('More communities').click()
    cy.get('input[placeholder="Search communities"]').click().clear().type(optionLabel)
    cy.get('[role="option"]').contains(optionLabel).click()
  }

  it('switches communities from the rail and persists the choice across reload', () => {
    // Start scoped to the first community.
    cy.visit(`/g/community/${first}/discussions`)
    cy.url().should('include', `/community/${first}/discussions`)

    switchCommunity('Product')
    cy.url().should('include', `/community/${second}/discussions`)

    // A deliberate switch persists, so a fresh `/g` visit reopens the chosen community.
    cy.visit('/g')
    cy.url().should('include', `/community/${second}/discussions`)
  })

  it('does not change the persisted home community when following a deep link', () => {
    // Deliberately switch to the second community so it becomes the persisted home.
    cy.visit(`/g/community/${first}/discussions`)
    switchCommunity('Product')
    cy.visit('/g')
    cy.url().should('include', `/community/${second}/discussions`)

    // Follow a deep link into the other community (e.g. a shared/notification link).
    cy.visit(`/g/community/${first}/discussions`)
    cy.url().should('include', `/community/${first}/discussions`)

    // Returning home should still resolve to the deliberately selected community.
    cy.visit('/g')
    cy.url().should('include', `/community/${second}/discussions`)
  })
})
