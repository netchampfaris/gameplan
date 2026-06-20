describe('Mobile community home', () => {
  const first = 'design'
  const second = 'support'
  let firstSpace: string

  beforeEach(() => {
    cy.login()
    cy.viewport('iphone-6')
    cy.request({
      method: 'POST',
      url: '/api/method/gameplan.test_api.clear_data',
    })

    cy.request('POST', '/api/method/frappe.client.insert_many', {
      docs: [
        { doctype: 'GP Team', title: 'Design' },
        { doctype: 'GP Team', title: 'Support' },
        { doctype: 'GP Project', title: 'Brand', team: first },
        { doctype: 'GP Project', title: 'Tickets', team: second },
      ],
    })
      .its('body.message')
      .then((names) => {
        firstSpace = String(names[2])

        cy.request('POST', '/api/v2/method/GP Team/update_joined_teams', {
          teams: [first, second],
        })
      })
  })

  it('drills from Home into a community menu, feeds, spaces, and global tabs', () => {
    cy.visit('/g')
    cy.url().should('include', '/home')
    cy.contains('button', 'Design').should('be.visible')
    cy.contains('button', 'Support').should('be.visible')

    cy.contains('button', 'Design').click()
    cy.url().should('include', `/community/${first}/menu`)
    cy.contains('button', 'All discussions').should('be.visible')
    cy.contains('button', 'Unread').should('be.visible')
    cy.contains('button', 'Participating').should('be.visible')
    cy.contains('button', 'Brand').should('be.visible')
    cy.contains('button', 'Tickets').should('not.exist')

    cy.contains('button', 'All discussions').click()
    cy.url().should('include', `/community/${first}/discussions`)

    cy.go('back')
    cy.url().should('include', `/community/${first}/menu`)
    cy.contains('button', 'Brand').click()
    cy.url().should('include', `/community/${first}/space/${firstSpace}`)

    cy.iconButton('Search').click()
    cy.url().should('include', '/search')
    cy.contains('button', 'All discussions').should('not.exist')
    cy.contains('button', 'Brand').should('not.exist')

    cy.iconButton('You').click()
    cy.url().should('include', '/more')
    cy.contains('View profile').should('be.visible')
    cy.contains('button', 'Bookmarks').should('be.visible')
    cy.contains('button', 'People').should('be.visible')
    cy.contains('button', 'Pages').should('be.visible')
    cy.contains('button', 'Tasks').should('be.visible')
    cy.contains('button', 'Drafts').should('be.visible')
    cy.contains('button', 'Manage').scrollIntoView().should('be.visible')
  })
})
