import numpy as np, json
def cr(P,n=12):
    P=np.array(P,float); P=np.vstack([P[0],P,P[-1]]); o=[]
    for i in range(1,len(P)-2):
        p0,p1,p2,p3=P[i-1],P[i],P[i+1],P[i+2]
        for t in np.linspace(0,1,n,endpoint=False):
            t2,t3=t*t,t*t*t
            o.append(0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3))
    o.append(P[-2]); return np.array(o)
def resample(c,step=2.0):
    d=np.r_[0,np.cumsum(np.linalg.norm(np.diff(c,axis=0),axis=1))]
    s=np.arange(0,d[-1],step); return np.stack([np.interp(s,d,c[:,0]),np.interp(s,d,c[:,1])],1), d[-1]
