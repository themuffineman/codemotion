import cv2, sys
im=cv2.imread(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); s=float(sys.argv[6]); out=sys.argv[7]
cr=cv2.resize(im[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
for x in range(x0-x0%10+10,x1,10):
    X=int((x-x0)*s); c=(0,220,255) if x%50==0 else (70,70,70)
    cv2.line(cr,(X,0),(X,cr.shape[0]),c,1)
    if x%50==0: cv2.putText(cr,str(x),(X+2,12),0,0.4,(255,255,255),1)
for y in range(y0-y0%10+10,y1,10):
    Y=int((y-y0)*s); c=(0,220,255) if y%50==0 else (70,70,70)
    cv2.line(cr,(0,Y),(cr.shape[1],Y),c,1)
    if y%50==0: cv2.putText(cr,str(y),(2,Y-2),0,0.4,(255,255,255),1)
cv2.imwrite(out,cr)
