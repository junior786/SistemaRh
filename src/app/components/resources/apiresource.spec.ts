import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Endereco } from '../model/endereco';
import { Pessoa } from '../model/pessoa';
import { Apiresource } from './apiresource';

describe('ApiResource', () => {
    let service: Apiresource;
    let httpMock: HttpTestingController;
   
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule
            ],
            providers: [
                Apiresource
            ]
        })
        service = TestBed.inject(Apiresource);
        httpMock = TestBed.inject(HttpTestingController)
    })

    it('should list of person', () => {
        const listPessoa: Pessoa[] =
        [
            {
                id: 1,
                nome: 'teste',
                sexo: 'teste',
                endereco: new Endereco
            },
            {
                id: 2,
                nome: 'teste 2',
                sexo: 'teste 2',
                endereco: new Endereco
            }
    
        ];
        service.getApi().subscribe(data => {
            expect(data.length).toEqual(2)
        })

        const req = httpMock.expectOne('http://localhost:8081/v1/pessoas');
        expect(req.request.method).toBe('GET');
        req.flush(listPessoa);
    })

    it('should exclude by id', () => {
        const person: Pessoa = {
            id: 1,
            nome: 'teste',
            endereco: new Endereco,
            sexo: 'teste'
        }
        service.deletePessoa(1).subscribe(data =>{
            expect(data.id).toEqual(1);
        })

        const req = httpMock.expectOne('http://localhost:8081/v1/pessoa/1');
        expect(req.request.method).toBe('DELETE')
        req.flush(person);
    })

    it('should find by id', () => {
        const person: Pessoa = {
            id: 1,
            nome: 'teste',
            endereco: new Endereco,
            sexo: 'teste'
        }
        service.getById(1).subscribe(data => {
            expect(data.id).toEqual(1);
        })
        const req = httpMock.expectOne('http://localhost:8081/v1/pessoa/1');
        expect(req.request.method).toBe('GET')
        req.flush(person);
    })

    it('should modify by id', () =>{
        const person: Pessoa = {
            id: 1,
            nome: 'modificado',
            endereco: new Endereco,
            sexo: 'teste'
        }
        service.putPessoa(1, person).subscribe(data =>{
            expect(data.id).toEqual(1)
        })
        const req = httpMock.expectOne('http://localhost:8081/v1/pessoa/1')
        expect(req.request.method).toBe('PUT')
        req.flush(person)

    })
})