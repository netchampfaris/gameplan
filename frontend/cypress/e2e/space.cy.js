describe('Space', () => {
  it('space creation', () => {
    cy.login()
    cy.request({
      method: 'POST',
      url: '/api/method/gameplan.test_api.clear_data?onboard=1',
    })
    cy.visit('/g/')

    // Create space
    cy.iconButton('Add Space').click()
    cy.input({ placeholder: 'Space name' }).type('Engineering')
    cy.button('Submit').click()

    // Check space
    cy.wait(3000)
    cy.get('h3:contains("Engineering")').should('exist')
    cy.url().should('include', '/g/space/')
  })
})
