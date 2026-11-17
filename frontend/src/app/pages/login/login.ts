import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/format';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  readonly enviando = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set('');

    const { correo, password } = this.form.getRawValue();
    this.auth.login(correo, password).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: (error) => {
        this.enviando.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }
}
