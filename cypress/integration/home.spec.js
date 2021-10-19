describe('Should render the table ', () => {
    it('Should render the table', () => {

        cy.intercept('**/pessoas', (req) => {
            req.reply({
                statusCode: 200,
                body: [
                    {

                        nome: 'teste',
                        sexo: 'masculino',
                        cep: '91750620',
                        numero: 10
                    },
                    
                    {
                        nome: 'teste',
                        sexo: 'masculino',
                        cep: '91750620',
                        numero: 10
                    },
                ]
            })
        })
        cy.visit('http://localhost:4200');
        cy.get('app-home');
        cy.get('.person-table');
    })
})