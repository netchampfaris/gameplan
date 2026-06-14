// Phase 09 regression smoke: asserts the community-scope end state.
// - No global discussions feed: `/` and `/home` resolve to community discussions.
// - The community sidebar is visible on `/community/:communityId/*` and hidden on
//   global routes.
// - `/bookmarks` stays a global destination.
describe('Community scope smoke', () => {
  const community = 'operations'
  let spaceId: string

  beforeEach(() => {
    cy.login()
    cy.request({
      method: 'POST',
      url: '/api/method/gameplan.test_api.clear_data',
    })

    // One joined public community with a space, so it is a valid landing
    // destination and the scoped-route guard does not 404.
    cy.request('POST', '/api/method/frappe.client.insert_many', {
      docs: [
        { doctype: 'GP Team', title: 'Operations' },
        { doctype: 'GP Project', title: 'Logistics', team: community },
      ],
    })
      .its('body.message')
      .then((names) => {
        spaceId = String(names[1])

        cy.request('POST', '/api/v2/method/GP Team/update_joined_teams', {
          teams: [community],
        })
      })
  })

  it('resolves `/` and `/home` to community discussions (no global feed)', () => {
    cy.visit('/g')
    cy.url().should('match', new RegExp(`/community/${community}/discussions`))

    cy.visit('/g/home')
    cy.url().should('match', new RegExp(`/community/${community}/discussions`))
  })

  it('shows the community sidebar on scoped routes and hides it on global ones', () => {
    cy.visit(`/g/community/${community}/discussions`)
    // Sidebar lists this community's spaces and feed-type rows.
    cy.contains('a', 'Logistics').should('be.visible')
    cy.contains('All Discussions').should('be.visible')

    // Global routes drop the community sidebar; its space rows are gone.
    cy.visit('/g/bookmarks')
    cy.url().should('include', '/bookmarks')
    cy.contains('a', 'Logistics').should('not.exist')
  })

  it('keeps `/bookmarks` global', () => {
    cy.visit('/g/bookmarks')
    cy.url().should('include', '/bookmarks')
    cy.url().should('not.include', '/community/')
  })
})
