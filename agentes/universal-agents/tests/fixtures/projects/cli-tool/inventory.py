from argparse import ArgumentParser

parser = ArgumentParser(prog="inventory")
parser.add_argument("--format", choices=("text", "json"), default="text")
