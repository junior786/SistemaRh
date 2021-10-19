describe('Should render the form', () => {
    it('Should show the form', () => {
        cy.visit('http://localhost:4200')
        cy.get('.redirect-form')
            .click();
    })
})