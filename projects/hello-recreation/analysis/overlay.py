import numpy as np, cv2, json, sys
pts=np.array(json.load(open(sys.argv[1])),float); fr=sys.argv[2]; out=sys.argv[3]; R=float(sys.argv[4]) if len(sys.argv)>4 else 20
def cr(P,n=12):
    P=np.vstack([P[0],P,P[-1]]); o=[]
    for i in range(1,len(P)-2):
        p0,p1,p2,p3=P[i-1],P[i],P[i+1],P[i+2]
        for t in np.linspace(0,1,n,endpoint=False):
            t2,t3=t*t,t*t*t
            o.append(0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3))
    o.append(P[-2]); return np.array(o)
c=cr(pts)
im=cv2.imread(fr)
S=2; im=cv2.resize(im,None,fx=S,fy=S)
d=np.gradient(c,axis=0); nrm=np.stack([-d[:,1],d[:,0]],1); nrm/=np.linalg.norm(nrm,axis=1,keepdims=True)+1e-9
for off,col in [(R,(0,255,0)),(-R,(0,255,0)),(0,(255,255,255))]:
    q=((c+nrm*off)*S).astype(np.int32)
    cv2.polylines(im,[q],False,col,1,cv2.LINE_AA)
for i,p in enumerate(pts): cv2.circle(im,(int(p[0]*S),int(p[1]*S)),2,(0,0,255),-1)
x0,y0,x1,y1=[int(v*S) for v in (c[:,0].min()-40,c[:,1].min()-40,c[:,0].max()+40,c[:,1].max()+40)]
cv2.imwrite(out,im[y0:y1,x0:x1])
