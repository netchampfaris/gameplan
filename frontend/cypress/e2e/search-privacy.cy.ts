describe('Search privacy', () => {
  const community = 'engineering'
  const publicTerm = 'visiblebanana'
  const privateTerm = 'secretbanana'

  beforeEach(() => {
    cy.login()
    cy.request({
      method: 'POST',
      url: '/api/method/gameplan.test_api.clear_data',
    })
    cy.clearLocalStorage()

    cy.request('POST', '/api/method/frappe.client.insert_many', {
      docs: [
        { doctype: 'GP Team', title: 'Engineering' },
        { doctype: 'GP Project', title: 'Public Search Space', team: community },
        {
          doctype: 'GP Project',
          title: 'Private Search Space',
          team: community,
          is_private: 1,
        },
      ],
    })
      .its('body.message')
      .then((names) => {
        const publicSpace = String(names[1])
        const privateSpace = String(names[2])

        cy.request('POST', '/api/v2/method/GP Team/update_joined_teams', {
          teams: [community],
        })

        cy.request('POST', '/api/method/frappe.client.insert_many', {
          docs: [
            {
              doctype: 'GP Discussion',
              title: 'Public Search Result',
              content: `<p>${publicTerm}</p>`,
              project: publicSpace,
              team: community,
            },
            {
              doctype: 'GP Discussion',
              title: 'Private Search Result',
              content: `<p>${privateTerm}</p>`,
              project: privateSpace,
              team: community,
            },
          ],
        })

        cy.request('POST', '/api/method/gameplan.test_api.rebuild_search_index')
      })
  })

  it('shows private-space search results only to space members', () => {
    cy.visit(`/g/search?q=${privateTerm}`)
    cy.contains('Private Search Result').should('be.visible')

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

    cy.visit(`/g/search?q=${publicTerm}`)
    cy.contains('Public Search Result').should('be.visible')

    cy.visit(`/g/search?q=${privateTerm}`)
    cy.contains('Private Search Result').should('not.exist')
  })
})
