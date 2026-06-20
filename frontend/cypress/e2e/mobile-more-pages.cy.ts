describe('Mobile More-menu pages', () => {
  const community = 'design'

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
        { doctype: 'GP Project', title: 'Brand', team: community },
      ],
    }).then(() => {
      cy.request('POST', '/api/v2/method/GP Team/update_joined_teams', {
        teams: [community],
      })
    })
  })

  // Land on the More menu directly; the Home→You tab path is covered by
  // community-mobile-home.cy.ts and is flaky to re-drive here.
  const openMore = () => {
    cy.visit('/g/more')
    cy.url().should('include', '/more')
  }

  // The mobile header is the only *visible* <h1> on each page (the desktop
  // PageHeader uses Breadcrumbs). The :visible filter also skips the hidden
  // mobile header that teleports alongside the desktop one at wide widths.
  it('opens each workspace page with a mobile header and backs out to More', () => {
    const pages = [
      { label: 'Bookmarks', path: '/bookmarks', title: 'Bookmarks' },
      { label: 'Pages', path: '/pages', title: 'Pages' },
      { label: 'Tasks', path: '/tasks', title: 'Tasks' },
      { label: 'People', path: '/people', title: 'People' },
      { label: 'Drafts', path: '/drafts', title: 'Drafts' },
      { label: 'Manage', path: '/configure', title: 'Communities' },
    ]

    pages.forEach(({ label, path, title }) => {
      openMore()
      cy.button(label).scrollIntoView().click()
      cy.url().should('include', path)
      cy.contains('h1:visible', title)

      // Shared MobileBackButton (aria-label "Back") returns to the More menu.
      cy.iconButton('Back').click()
      cy.url().should('include', '/more')
    })
  })

  it('relocates header actions into the mobile header slots', () => {
    openMore()
    cy.button('Tasks').click()
    cy.iconButton('Add task').should('be.visible')

    openMore()
    cy.button('People').click()
    cy.iconButton('Invite').should('be.visible')

    openMore()
    cy.button('Pages').click()
    // Sort control moves into the right slot of the mobile header (default order
    // is "Date Updated").
    cy.get('header').filter(':visible').contains('Date Updated').should('be.visible')
  })

  it('walks the Configure hierarchy with a level-aware back button', () => {
    cy.visit(`/g/configure/${community}/members`)
    cy.contains('h1:visible', 'Members')

    // Members → community spaces.
    cy.iconButton('Back').click()
    cy.url().should('include', `/configure/${community}`).and('not.include', '/members')
    cy.contains('h1:visible', 'Design')

    // Community spaces → communities list.
    cy.iconButton('Back').click()
    cy.url().should('match', /\/configure$/)
    cy.contains('h1:visible', 'Communities')
  })

  it('keeps the desktop header and hides the mobile back button at wide widths', () => {
    cy.viewport(1280, 800)
    cy.visit('/g/bookmarks')

    // Desktop PageHeader (Breadcrumbs) is the visible header…
    cy.get('header').filter(':visible').should('contain.text', 'Bookmarks')
    // …while the mobile-only header h1 + back button are present but not shown.
    cy.contains('h1:visible', 'Bookmarks').should('not.exist')
    cy.get('button[aria-label="Back"]:visible').should('not.exist')
  })
})
