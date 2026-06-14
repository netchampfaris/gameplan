// Onboarding now creates a Community + a first Space (Phase 08). The GP Team
// after_insert hook also auto-creates a public `General` space, so a freshly
// onboarded site lands with two spaces, scoped to the new community's discussions.
describe('Onboarding', () => {
  beforeEach(() => {
    cy.login()
    cy.request({
      method: 'POST',
      url: '/api/method/gameplan.test_api.clear_data',
    })
  })

  it('creates a community + first space and lands on community discussions', () => {
    cy.visit('/g')
    cy.url().should('include', '/onboarding')

    cy.get('input#new-community-name').type('Acme')
    cy.get('input[placeholder*=Townhall]').type('Marketing')
    cy.button('Continue').click()

    // Lands on the new community's canonical discussions URL.
    cy.url().should('match', /\/community\/[^/]+\/discussions/)

    // Sidebar shows the discussions row plus the auto-created public General space
    // and the user-named space as space links.
    cy.contains('All Discussions').should('exist')
    cy.contains('a', 'General').should('exist')
    cy.contains('a', 'Marketing').should('exist')
  })
})
