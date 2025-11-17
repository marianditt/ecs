import { Middleware } from './middleware';
import { Service, ServiceImpl } from './service';

export type System<T> = (service: Service<T>) => void;

export class Controller<T> {
  public constructor(private readonly service: ServiceImpl<T>) {}

  public use(middleware: Middleware<T>): void {
    this.service.use(middleware);
  }

  public handle(system: System<T>): void {
    try {
      system(this.service);
      this.service.commit();
    } catch {
      this.service.revert();
    }
  }
}
