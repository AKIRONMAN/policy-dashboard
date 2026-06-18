import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeng/themes/lara';
import { routes } from './app.routes';
import { policyFeature } from './state/policy/policy.reducer';
import { PolicyEffects } from './state/policy/policy.effects';
import { httpInterceptor } from './core/interceptors/http.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),

    provideHttpClient(withInterceptors([httpInterceptor])),
    provideStore({
      [policyFeature.name]: policyFeature.reducer,
    }),
    provideEffects([PolicyEffects]),
    provideStoreDevtools({ maxAge: 25 }),
    providePrimeNG({
      theme: {
        preset: Lara,
      },
      ripple: true,
    }),
  ],
};
