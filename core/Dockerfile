# Initial Updated Python 3.7 Image
FROM python:3.7
RUN apt-get update

# Setup AWS Lambda RIE
ADD https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie /usr/bin/aws-lambda-rie
RUN chmod 755 /usr/bin/aws-lambda-rie

# Create function directory
RUN mkdir -p /usr/lambda
RUN mkdir -p /usr/library

# Copy function code
COPY . /usr/library
COPY ./lambda.py /usr/lambda/

# Build the library into a wheel file
WORKDIR /usr/library/
RUN python setup.py bdist_wheel

# Install requirements and library using our custom Artifact Repository
RUN pip install -r requirements.txt
RUN pip install dist/*.whl
RUN pip install awslambdaric

# Go to the Lambda directory for easier triggers
WORKDIR /usr/lambda/

# lambda.lambda_handler
# python, -m, awslambdaric
