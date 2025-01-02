from dagster import job, op
from dagster import execute_job, DagsterInstance, reconstructable

# Définition d'un "op" qui représente une étape de traitement
@op
def hello_world(context):
    context.log.info('Hello, World!')

# Définition d'un job utilisant l'op
@job
def hello_world_job():
    hello_world()

# Exécution du job localement
if __name__ == "__main__":
    instance = DagsterInstance.ephemeral()  # Utilisation de l'instance éphémère
    result = execute_job(reconstructable(hello_world_job), instance=instance)
