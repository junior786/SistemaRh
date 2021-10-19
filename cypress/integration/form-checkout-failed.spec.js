describe('Should show disabled button', () => {
    it('Should show input failed', () => {
        cy.visit('http://localhost:4200/adicionar');
        cy.visit('http://localhost:4200/adicionar');
        cy.get('#nome')
            .type('12');
        cy.get('#sexo')
            .type('12');
        cy.get('#cep')
            .type('12');
        cy.get('#numero')
            .type(100);
        cy.get('form')
            .find('button')
            .should('be.disabled')
    })
})