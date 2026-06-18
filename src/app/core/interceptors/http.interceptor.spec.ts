import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

describe('httpInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  describe('successful requests', () => {
    it('should allow successful GET requests', () => {
      const testData = { test: 'data' };

      httpClient.get('/api/test').subscribe((response) => {
        expect(response).toEqual(testData);
      });

      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('GET');
      req.flush(testData);
      httpMock.verify();
    });

    it('should allow successful POST requests', () => {
      const testData = { test: 'data' };

      httpClient.post('/api/test', testData).subscribe((response) => {
        expect(response).toEqual(testData);
      });

      const req = httpMock.expectOne('/api/test');
      expect(req.request.method).toBe('POST');
      req.flush(testData);
      httpMock.verify();
    });
  });

  describe('error handling', () => {
    it('should handle 401 unauthorized errors', (done) => {
      httpClient.get('/api/test').subscribe(
        () => fail('should have failed'),
        () => {
          done();
        }
      );

      const req = httpMock.expectOne('/api/test');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 500 server errors', (done) => {
      httpClient.get('/api/test').subscribe(
        () => fail('should have failed'),
        () => {
          done();
        }
      );

      const req = httpMock.expectOne('/api/test');
      req.flush('Server Error', { status: 500, statusText: 'Server Error' });
    });
  });
});
