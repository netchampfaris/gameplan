// High-order coverage for the Phase 05 scoped route audit: links from global
// surfaces (the /spaces housekeeping page, bookmarks) must resolve into
// canonical `/community/:communityId/...` routes, and a space breadcrumb's root
// must point at community discussions rather than the global /spaces page.
describe('Community scoped links', () => {
  const community = 'engineering'
  let spaceId: string
  let discussionId: string

  beforeEach(() => {
    cy.login()
    cy.request({
      method: 'POST',
      url: '/api/method/gameplan.test_api.clear_data',
    })

    // One joined public community with a space, so it is a valid landing destination
    // and the scoped-route guard does not 404.
    cy.request('POST', '/api/method/frappe.client.insert_many', {
      docs: [
        { doctype: 'GP Team', title: 'Engineering' },
        { doctype: 'GP Project', title: 'Gameplan', team: community },
      ],
    })
      .its('body.message')
      .then((names) => {
        spaceId = String(names[1])

        cy.request('POST', '/api/v2/method/GP Team/update_joined_teams', {
          teams: [community],
        })

        // A discussion in that space, so bookmark/search links have a target.
        // `team` is denormalized; set it so the discussion is resolvable.
        cy.request('POST', '/api/method/frappe.client.insert', {
          doc: {
            doctype: 'GP Discussion',
            title: 'Scoped link discussion',
            content: 'Body',
            project: spaceId,
            team: community,
          },
        })
          .its('body.message.name')
          .then((name) => {
            discussionId = String(name)
            // Bookmark it so it shows on the global /bookmarks page.
            cy.request('POST', `/api/v2/document/GP Discussion/${discussionId}/method/add_bookmark`)
          })
      })
  })

  it('opens a space from the community sidebar on the canonical scoped route', () => {
    // The old global /spaces page is now an admin housekeeping view with no
    // space navigation; the community sidebar is the surface that links a space
    // to its canonical scoped route.
    cy.visit(`/g/community/${community}/discussions`)
    cy.contains('a', 'Gameplan').click()
    cy.url().should('include', `/community/${community}/space/${spaceId}`)
  })

  it('opens a bookmarked discussion on a canonical scoped route', () => {
    cy.visit('/g/bookmarks')
    cy.contains('Scoped link discussion').click()
    cy.url().should('include', `/community/${community}/`)
    cy.url().should('include', `/discussion/${discussionId}`)
  })

  it('points the space breadcrumb root at the canonical scoped space route, not /spaces', () => {
    cy.visit(`/g/community/${community}/space/${spaceId}`)

    // The community title was intentionally removed from the space breadcrumbs;
    // the root crumb is now the space itself and links to its canonical scoped
    // route. It must not route back to the global /spaces page.
    cy.get('.space-breadcrumbs')
      .contains('a', 'Gameplan')
      .should('have.attr', 'href')
      .and('include', `/community/${community}/space/${spaceId}`)
      .and('not.include', '/spaces')
  })
})
