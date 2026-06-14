// The "+ New discussion" entry point now lives only inside the community
// discussions list (Phase 06); the global /drafts page is a pure list with no
// "Add new" button. These tests drive the scoped composer from a joined
// community and verify draft autosave + publish on the canonical scoped route.
describe('New Discussion - Draft Functionality', () => {
  const community = 'engineering'
  let spaceId: string

  beforeEach(() => {
    cy.login()
    cy.request({
      method: 'POST',
      url: '/api/method/gameplan.test_api.clear_data',
    })

    cy.request('POST', '/api/method/frappe.client.insert_many', {
      docs: [
        { doctype: 'GP Team', title: 'Engineering' },
        { doctype: 'GP Project', title: 'Gameplan', team: community },
      ],
    })
      .its('body.message')
      .then((data) => {
        spaceId = String(data[1])
        // Scoped routes only resolve a joined community.
        cy.request('POST', '/api/v2/method/GP Team/update_joined_teams', {
          teams: [community],
        })
      })
  })

  it('should create, save, and verify a draft, then publish it', () => {
    // The community discussions list is the only "+ New discussion" entry point.
    cy.visit(`/g/community/${community}/discussions`)
    cy.button('Add new').click()
    cy.url().should('include', `/community/${community}/new-discussion`)

    // Verify page loads correctly
    cy.contains('New Discussion').should('exist')
    cy.get('textarea[placeholder="Title"]').should('exist')
    cy.get('[contenteditable=true]').should('exist')

    // Create the draft. A draft is only persisted once a space is chosen.
    cy.get('textarea[placeholder="Title"]').type('My Draft Discussion{enter}')
    cy.get('[contenteditable=true]').click().type('This is my draft content that should be saved.')
    cy.contains('button[aria-haspopup="listbox"]', 'Select Space').click({ force: true })
    cy.get('[role="option"]').contains('Gameplan').click()
    cy.wait(500) // let the draft auto-save once a space is selected

    // The draft shows up on the global Drafts list.
    cy.visit('/g/drafts')
    cy.contains('My Draft Discussion').should('exist')
    cy.contains('This is my draft content that should be saved.').should('exist')

    // Reopen the draft and edit it.
    cy.contains('My Draft Discussion').click()
    cy.get('textarea[placeholder="Title"]').should('have.value', 'My Draft Discussion')
    cy.get('[contenteditable=true]')
      .click()
      .clear()
      .type('This is my updated draft content. Ready to publish!')
    cy.wait(500)

    // Publish lands on the canonical scoped Discussion route.
    cy.button('Publish').click()
    cy.url().should('include', `/community/${community}/space/${spaceId}/discussion/`)
    cy.contains('My Draft Discussion').should('exist')
    cy.contains('This is my updated draft content. Ready to publish!').should('exist')

    // The published draft is gone from the Drafts list.
    cy.visit('/g/drafts')
    cy.contains('My Draft Discussion').should('not.exist')
  })

  it('should show publish button on mobile new discussion page', () => {
    cy.viewport('iphone-6')
    cy.visit(`/g/community/${community}/new-discussion`)

    cy.contains('New Discussion').should('exist')
    cy.button('Publish').should('be.visible')
  })
})
