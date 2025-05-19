import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class PasswordMatchValidator {
  static match(controlName: string, matchControlName: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const control = group.get(controlName);
      const matchControl = group.get(matchControlName);

      if (!control || !matchControl) return null;

      if (control.value !== matchControl.value) {
        matchControl.setErrors({ passwordMismatch: true });
        return { passwordMismatch: true };
      } else {
        // Elimina el error si las contraseñas coinciden, pero mantiene otros errores
        const errors = matchControl.errors;
        if (errors && 'passwordMismatch' in errors) {
          delete errors["passwordMismatch"];
          matchControl.setErrors(Object.keys(errors).length ? errors : null);
        }
        return null;
      }
    };
  }
}
