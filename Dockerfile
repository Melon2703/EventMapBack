FROM node:latest

# Install PostgreSQL server and client
RUN apt-get update && apt-get install -y postgresql postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Copy the PostgreSQL dump file to the container
COPY ./postgres_dump.sql /docker-entrypoint-initdb.d/postgres_dump.sql

# Copy the updated pg_hba.conf file to the container
COPY ./pg_hba.conf /etc/postgresql/13/main/pg_hba.conf

# Set the working directory and copy the application files
WORKDIR /app
COPY . .

# Install the application dependencies
RUN npm install

# Expose the ports and define environment variables for the database connection
EXPOSE 3000
EXPOSE 5432
ENV DATABASE_HOST=localhost
ENV DATABASE_PORT=5432
ENV DATABASE_USER=postgres
ENV DATABASE_PASSWORD=1234
ENV DATABASE_NAME=postgres

# Add a script to start the database server and wait for it to be ready before starting the server
CMD ["sh", "-c", "service postgresql start && until pg_isready -h $DATABASE_HOST -p $DATABASE_PORT; do sleep 1; done; \
    psql --username=$DATABASE_USER --dbname=$DATABASE_NAME --file=/docker-entrypoint-initdb.d/postgres_dump.sql && \
    npm start"]
