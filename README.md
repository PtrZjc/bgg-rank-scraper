# BGG Rank Scraper

This project is designed to scrape board game rankings from [BoardGameGeek](https://boardgamegeek.com/browse/boardgame) and store the results in an AWS S3 bucket. It utilizes AWS SAM for deployment and management of the resources needed for this functionality.

## Project Structure

- `samconfig.toml`: Configuration file for deploying with AWS SAM CLI. More details can be found in the [AWS SAM CLI documentation](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html).
- `fetch_games`: Python package containing the lambda function for scraping BoardGameGeek.
  - `requirements.txt`: Lists all Python dependencies for the lambda function.
  - `__init__.py`: Marks the directory as a Python package.
  - `app.py`: Contains the lambda function code to fetch game rankings and store them in S3.
- `template.yaml`: AWS SAM template defining AWS resources for the project.

## Deployment

To deploy this project, follow these steps:

1. **Set up AWS SAM CLI**: If you haven't already, install and set up the AWS SAM CLI following the instructions [here](https://aws.amazon.com/serverless/sam/).

2. **Configure AWS Credentials**: Ensure your AWS credentials are configured properly by running `aws configure`.

3. **Build the project**:
   ```sh
   sam build
   ```
   This command compiles the project and prepares it for deployment.

4. **Deploy the project**:
   ```sh
   sam deploy
   ```
   Follow the prompts to deploy the project resources to AWS.

## Functionality

- The lambda function defined in `fetch_games/app.py` scrapes the first 5 pages of board game rankings from BoardGameGeek.
- It constructs a semicolon-separated list of game rankings, names, and links, which is then stored in an S3 bucket as a text file.
- The lambda function is triggered daily by a scheduled event defined in the `template.yaml`.

## Modifying the Configuration

- If you need to change the configuration, such as the S3 bucket name or the lambda function's memory size, you can do so in `template.yaml`.
- Any changes to the deployment process can be modified in `samconfig.toml`.
