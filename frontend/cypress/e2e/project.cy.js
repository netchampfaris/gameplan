describe('Project', () => {
  it('moves a space to another community and archives it', () => {
    cy.login()
    cy.request({
      method: 'POST',
      url: '/api/method/gameplan.test_api.clear_data',
    })
    cy.request('POST', '/api/method/frappe.client.insert_many', {
      docs: [
        {
          doctype: 'GP Team',
          title: 'Engineering',
        },
        {
          doctype: 'GP Team',
          title: 'DevOps',
        },
        {
          doctype: 'GP Project',
          title: 'Project 1',
          team: 'engineering',
        },
      ],
    })
      .its('body.message')
      .then((names) => {
        const projectName = String(names[2])

        // Every space now belongs to a community, and scoped routes only resolve a
        // joined community, so join both teams before navigating to their spaces.
        cy.request('POST', '/api/v2/method/GP Team/update_joined_teams', {
          teams: ['engineering', 'devops'],
        })

        // move to community
        cy.visit('/g/configure/engineering')
        cy.selectDropdownOption('Project 1 Space Options', 'Change Community')
        cy.selectCombobox('Select a community', 'DevOps')
        cy.button('Move to DevOps').click()
        cy.request('POST', '/api/method/frappe.client.get_value', {
          doctype: 'GP Project',
          filters: { name: projectName },
          fieldname: ['team'],
        })
          .its('body.message.team')
          .should('eq', 'devops')

        cy.visit(`/g/community/devops/space/${projectName}`)
        cy.url().should('include', `/g/community/devops/space/${projectName}`)
        cy.get('header').contains('Project 1').should('exist')

        // archive while pinned; this exercises the backend cleanup path that
        // removes current-user pins for archived spaces.
        cy.request('POST', '/api/method/frappe.client.insert', {
          doc: {
            doctype: 'GP Pinned Project',
            project: projectName,
          },
        })

        cy.visit('/g/configure/devops')
        cy.selectDropdownOption('Project 1 Space Options', 'Archive')
        cy.scope('dialog').button('Archive').click()
        cy.contains('div', 'Archived').should('exist')
        cy.request('POST', '/api/method/frappe.client.get_list', {
          doctype: 'GP Pinned Project',
          filters: { project: projectName },
          fields: ['name'],
        })
          .its('body.message')
          .should('have.length', 0)
        cy.visit('/g/configure/devops')
        cy.get('input[aria-label="Space title"]').should('not.exist')
        cy.get('button:contains("Archived")').click()
        cy.get('input[aria-label="Space title"]').should('have.value', 'Project 1')
      })
  })
})
