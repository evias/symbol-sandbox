import base64
import sys

print "BinData Value:", base64.b64encode(bytearray.fromhex(sys.argv[1]))
