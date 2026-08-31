import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppConfigModule } from '@app/config/app-config.module';
import { PrismaModule } from '@app/prisma/prisma.module';
import { RedisModule } from '@app/modules/redis/redis.module';
import { AuditModule } from '@app/modules/audit/audit.module';
import { AuthModule } from '@app/modules/auth/auth.module';
import { UsersModule } from '@app/modules/users/users.module';
import { RolesModule } from '@app/modules/roles/roles.module';
import { HealthModule } from '@app/modules/health/health.module';
import { TimelineModule } from '@app/modules/timeline/timeline.module';
import { CustomersModule } from '@app/modules/customers/customers.module';
import { CompaniesModule } from '@app/modules/companies/companies.module';
import { LeadsModule } from '@app/modules/leads/leads.module';
import { DealsModule } from '@app/modules/deals/deals.module';
import { ActivitiesModule } from '@app/modules/activities/activities.module';
import { TasksModule } from '@app/modules/tasks/tasks.module';
import { NotesModule } from '@app/modules/notes/notes.module';
import { SearchModule } from '@app/modules/search/search.module';
import { DestinationsModule } from '@app/modules/destinations/destinations.module';
import { ToursModule } from '@app/modules/tours/tours.module';
import { DeparturesModule } from '@app/modules/departures/departures.module';
import { TravelersModule } from '@app/modules/travelers/travelers.module';
import { BookingsModule } from '@app/modules/bookings/bookings.module';
import { QuotesModule } from '@app/modules/quotes/quotes.module';
import { InvoicesModule } from '@app/modules/invoices/invoices.module';
import { PaymentsModule } from '@app/modules/payments/payments.module';
import { SuppliersModule } from '@app/modules/suppliers/suppliers.module';
import { HotelsModule } from '@app/modules/hotels/hotels.module';
import { VehiclesModule } from '@app/modules/vehicles/vehicles.module';
import { GuidesModule } from '@app/modules/guides/guides.module';
import { DriversModule } from '@app/modules/drivers/drivers.module';
import { TripsModule } from '@app/modules/trips/trips.module';
import { ChecklistsModule } from '@app/modules/checklists/checklists.module';
import { NotificationsModule } from '@app/modules/notifications/notifications.module';
import { AutomationModule } from '@app/modules/automation/automation.module';
import { PublicModule } from '@app/modules/public/public.module';
import { ContentModule } from '@app/modules/content/content.module';
import { HrModule } from '@app/modules/hr/hr.module';
import { ProductsModule } from '@app/modules/products/products.module';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@app/common/guards/permissions.guard';
import { TransformInterceptor } from '@app/common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '@app/common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RedisModule,
    AuditModule,
    TimelineModule,
    RolesModule,
    UsersModule,
    AuthModule,
    HealthModule,
    CustomersModule,
    CompaniesModule,
    LeadsModule,
    DealsModule,
    ActivitiesModule,
    TasksModule,
    NotesModule,
    SearchModule,
    DestinationsModule,
    ToursModule,
    DeparturesModule,
    TravelersModule,
    BookingsModule,
    QuotesModule,
    InvoicesModule,
    PaymentsModule,
    SuppliersModule,
    HotelsModule,
    VehiclesModule,
    GuidesModule,
    DriversModule,
    TripsModule,
    ChecklistsModule,
    NotificationsModule,
    AutomationModule,
    PublicModule,
    ContentModule,
    HrModule,
    ProductsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
  ],
})
export class AppModule {}
